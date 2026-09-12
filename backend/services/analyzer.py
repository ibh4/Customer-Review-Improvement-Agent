"""核心分析引擎：负面评论聚类（Pain Point Mining）。

两种实现：
  - Baseline: TF-IDF + KMeans（默认，CPU 秒级，无外部依赖）
  - Better:   Sentence Embedding + KMeans（ENABLE_EMBEDDINGS=1 且已安装
              sentence-transformers 时启用，失败自动降级 TF-IDF）

聚类后通过痛点知识库打标 → 合并同类簇 → PainScore → Evidence 抽取。
"""
from __future__ import annotations

import logging
import re

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score

from backend.app.config import settings
from backend.services import pain_catalog
from backend.services.pain_score import compute_pain_scores

log = logging.getLogger("r2p.analyzer")

TOKEN_RE = re.compile(r"[a-z']+")


def simple_tokenize(text: str) -> str:
    return " ".join(TOKEN_RE.findall(text.lower()))


# ---------------------------------------------------------------------------
# 聚类实现
# ---------------------------------------------------------------------------

def _vectorize_tfidf(docs: list[str]):
    vec = TfidfVectorizer(
        preprocessor=simple_tokenize,
        ngram_range=(1, 2),
        min_df=max(2, len(docs) // 300),
        max_features=6000,
        sublinear_tf=True,
        stop_words="english",
    )
    X = vec.fit_transform(docs)
    return X, vec


def _vectorize_embeddings(docs: list[str]):
    from sentence_transformers import SentenceTransformer  # 可选依赖
    model = SentenceTransformer(settings.EMBEDDING_MODEL)
    X = model.encode(docs, batch_size=64, show_progress_bar=False, normalize_embeddings=True)
    return np.asarray(X), None


def _choose_k(X, k_min: int, k_max: int, sample: int = 1200) -> int:
    """用轮廓系数在 [k_min, k_max] 内选 k（大矩阵采样评估）。"""
    n = X.shape[0]
    best_k, best_s = k_min, -1.0
    rng = np.random.RandomState(42)
    idx = rng.choice(n, size=min(sample, n), replace=False) if n > sample else np.arange(n)
    Xs = X[idx] if hasattr(X, "shape") and getattr(X, "shape", 0) and len(X.shape) > 1 else X
    for k in range(k_min, k_max + 1):
        try:
            km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(Xs)
            s = float(silhouette_score(Xs, km.labels_)) if k < len(Xs) else -1.0
            if s > best_s:
                best_k, best_s = k, s
        except Exception:
            continue
    return best_k


def cluster_negative_reviews(df_neg: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """返回 (带 cluster 列的 df, 元信息)。df 需含 review_text/rating/helpful_vote/timestamp。"""
    docs = (df_neg["review_title"].fillna("") + ". " + df_neg["review_text"].fillna("")).tolist()
    n = len(docs)
    meta: dict = {"n_negative": n, "method": "tfidf_kmeans"}

    if n < 8:
        # 数据过少：全部归入单一簇，流程不中断
        df_neg = df_neg.copy()
        df_neg["cluster"] = 0
        meta["method"] = "single_cluster"
        return df_neg, meta

    method = "tfidf_kmeans"
    X = vec = None
    if settings.ENABLE_EMBEDDINGS:
        try:
            X, vec = _vectorize_embeddings(docs[:4000])
            method = "embedding_kmeans"
        except Exception as e:
            log.warning("embedding 聚类不可用，自动降级 TF-IDF：%s", e)
            X = vec = None
    if X is None:
        X, vec = _vectorize_tfidf(docs)

    k_min = max(4, min(6, n // 30))
    k_max = min(settings.MAX_KMEANS_K, max(4, int(np.sqrt(n / 2))))
    if k_max < k_min:
        k_min = k_max
    k = _choose_k(X, k_min, k_max) if n > 20 else max(2, min(3, n // 4))
    km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)

    df_neg = df_neg.copy()
    df_neg["cluster"] = km.labels_
    meta.update({"method": method, "k": int(k), "vectorizer": type(vec).__name__ if vec else "sentence-transformers"})
    return df_neg, meta


# ---------------------------------------------------------------------------
# 打标 + 合并 + 统计
# ---------------------------------------------------------------------------

def _keyword_idf_weights(df_neg: pd.DataFrame) -> dict[str, float]:
    """按负面语料计算每个关键词的 IDF 权重 + 短语加成，抑制 'lid/bottle' 类通用词。"""
    import math
    docs = (df_neg["review_title"].fillna("") + " " + df_neg["review_text"].fillna("")).str.lower().tolist()
    n = max(len(docs), 1)
    weights: dict[str, float] = {}
    for e in pain_catalog.CATALOG:
        for k in e.keywords:
            if k in weights:
                continue
            df = sum(1 for d in docs if k in d)
            base = math.log(n / (1 + df)) + 0.3          # IDF
            bonus = 2.5 if " " in k else 1.0             # 短语更具区分性
            weights[k] = round(base * bonus, 4)
    return weights


def label_and_merge(df_neg: pd.DataFrame, vec=None, X=None, km=None) -> list[dict]:
    """对每个簇：打痛点标签（IDF 加权知识库命中，否则 TF-IDF 主题词兜底）→ 合并同标签簇。"""
    weights = _keyword_idf_weights(df_neg)
    groups: dict[str, dict] = {}
    for cid, g in df_neg.groupby("cluster"):
        # 簇内每条评论独立加权打分，再按文档数聚合（避免高频通用词吞并整个簇）
        doc_hits: dict[str, float] = {}
        hit_docs: dict[str, int] = {}
        for t in (g["review_title"].fillna("") + " " + g["review_text"].fillna("")).str.lower():
            for name, sc in pain_catalog.score_text(t, weights).items():
                doc_hits[name] = doc_hits.get(name, 0.0) + sc
                hit_docs[name] = hit_docs.get(name, 0) + 1
        label, label_source = None, None
        if doc_hits:
            best = max(doc_hits, key=doc_hits.get)
            if hit_docs[best] / len(g) >= 0.25:  # 命中占比阈值
                label, label_source = best, "lexicon"
        if label is None:
            # 主题词（TF-IDF 区分度词 + 簇内高频实词）与知识库二次匹配
            tfidf_terms = _top_terms(g, topn=8).split(" / ")
            freq_terms = _cluster_keywords(g, None)
            top_terms = list(dict.fromkeys(tfidf_terms + freq_terms))
            lex = pain_catalog.label_from_terms(top_terms)
            if lex:
                label, label_source = lex, "lexicon_terms"
            else:
                label, label_source = f"Other: {_top_terms(g)}", "tfidf_terms"
        entry = groups.setdefault(label, {
            "name": label, "label_source": label_source, "df": [], "cluster_ids": [],
        })
        entry["df"].append(g)
        entry["cluster_ids"].append(int(cid))

    total_neg = len(df_neg)
    merged: list[dict] = []
    for label, entry in groups.items():
        g = pd.concat(entry["df"], ignore_index=False)
        if len(g) < settings.MIN_CLUSTER_SIZE and len(groups) > 3:
            continue
        cat = pain_catalog.CATALOG_BY_NAME.get(label)
        merged.append({
            "name": label,
            "display_name": cat.display_name if cat else label.replace("Other: ", "其他: "),
            "label_source": entry["label_source"],
            "cluster_ids": entry["cluster_ids"],
            "review_count": int(len(g)),
            "total_negative": total_neg,
            "share": round(len(g) / max(total_neg, 1), 4),
            "avg_rating": round(float(g["rating"].mean()), 2),
            "avg_helpful": float(g["helpful_vote"].mean()),
            "avg_timestamp": float(g["timestamp"].mean()),
            "index": g.index.tolist(),
            "keywords": _cluster_keywords(g, cat),
        })
    return merged


def _top_terms(g: pd.DataFrame, topn: int = 2) -> str:
    try:
        docs = (g["review_title"].fillna("") + ". " + g["review_text"].fillna("")).tolist()
        vec = TfidfVectorizer(preprocessor=simple_tokenize, ngram_range=(1, 1),
                              stop_words="english", min_df=1, max_features=800)
        X = vec.fit_transform(docs)
        terms = np.array(vec.get_feature_names_out())
        freq = np.asarray(X.sum(axis=0)).ravel()
        order = freq.argsort()[::-1][:topn]
        return " / ".join(terms[order])
    except Exception:
        return "misc"


def _cluster_keywords(g: pd.DataFrame, cat) -> list[str]:
    """簇内高频实词 top8，作为前端高亮词。"""
    blob = " ".join((g["review_title"].fillna("") + " " + g["review_text"].fillna("")).str.lower())
    words = TOKEN_RE.findall(blob)
    from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS
    counts: dict[str, int] = {}
    for w in words:
        if len(w) < 4 or w in ENGLISH_STOP_WORDS:
            continue
        counts[w] = counts.get(w, 0) + 1
    top = sorted(counts.items(), key=lambda x: -x[1])[:8]
    kw = [w for w, _ in top]
    if cat:
        for k in cat.keywords[:6]:
            if k not in kw and len(k) > 3 and not k.isnumeric():
                kw.append(k)
    return kw[:12]


def extract_evidence(df_all: pd.DataFrame, idx: list[int], n: int | None = None) -> list[str]:
    """Evidence 引擎：按 helpful_vote 降序 + 时间新 + 文本长度，抽取支撑评论 ID。"""
    n = n or settings.EVIDENCE_TOP_N
    g = df_all.loc[idx]
    g = g.sort_values(["helpful_vote", "timestamp", "review_text"], ascending=[False, False, False])
    return g["review_id"].head(n).tolist()


def mine_pain_points(df_product: pd.DataFrame) -> tuple[list[dict], pd.DataFrame, dict]:
    """完整 Pain Point Mining 流水线（不含 Agent 层）。"""
    df_neg = df_product[df_product["rating"] <= settings.NEGATIVE_MAX_RATING].copy()
    df_neg_en = df_neg[df_neg["language"] == "en"] if "language" in df_neg.columns else df_neg
    if df_neg_en.empty:
        df_neg_en = df_neg

    clustered, meta = cluster_negative_reviews(df_neg_en)
    merged = label_and_merge(clustered)
    scored = compute_pain_scores(merged)

    for p in scored:
        p["cluster_id"] = p["cluster_ids"][0]
        p["evidence_review_ids"] = extract_evidence(df_product, p.pop("index"))
        rep = df_product[df_product["review_id"].isin(p["evidence_review_ids"][:3])]
        p["representative_review_ids"] = rep["review_id"].tolist()
        if not p["evidence_review_ids"]:
            p["evidence_status"] = "insufficient_evidence"
        else:
            p["evidence_status"] = "ok"
        p.pop("avg_timestamp", None)
        p.pop("avg_helpful", None)

    return scored, clustered, meta
