"""分析编排：单商品全链路（挖掘→评分→Evidence→RootCause→参数→V2→Listing）→ 产物持久化。"""
from __future__ import annotations

import datetime as dt
import json
import logging

import pandas as pd

from backend.app.config import settings
from backend.services import analyzer, listing as listing_svc
from backend.services import product_engineer, root_cause
from backend.services.llm import llm_mode

log = logging.getLogger("r2p.analysis")


def _now() -> str:
    return dt.datetime.now().isoformat(timespec="seconds")


def _rating_distribution(df: pd.DataFrame) -> dict[str, int]:
    dist = df["rating"].value_counts().to_dict()
    return {str(int(k)): int(v) for k, v in sorted(dist.items())}


def _before_after_profile(pain_points: list[dict], params: list) -> dict:
    """Before/After 雷达图数据：能力维度直接取该商品真实痛点（Top 6，按痛点分数）。

    确定性公式（与前端 buildCapabilityProfile 保持一致，透明可解释）：
      V1 = 100 − pain_score × 0.62          （痛点越痛，现版该能力越弱）
      V2 = V1 + (97 − V1) × (0.55 + 0.40 × 平均置信度)   （置信度来自证据数量）
    不再使用硬编码品类维度，避免非水杯商品出现 V1 == V2 的死数据。
    """
    conf_by_pain: dict[str, list[float]] = {}
    for p in params:
        conf_by_pain.setdefault(p.pain_point, []).append(float(p.confidence))
    top = sorted(pain_points, key=lambda x: float(x.get("pain_score", 0)), reverse=True)[:6]
    labels, v1, v2 = [], [], []
    for p in top:
        confs = conf_by_pain.get(p["name"]) or [0.6]
        conf = sum(confs) / len(confs)
        a = min(95.0, max(25.0, 100.0 - float(p.get("pain_score", 0)) * 0.62))
        fix = 0.55 + 0.40 * min(1.0, max(0.0, conf))
        b = min(97.0, a + (97.0 - a) * fix)
        labels.append(p.get("display_name") or p["name"])
        v1.append(round(a, 1))
        v2.append(round(b, 1))
    return {"metrics": labels, "v1": v1, "v2": v2}


def _positioning(product_title: str, pain_points: list[dict]) -> str:
    top = [p["display_name"] for p in pain_points[:3]]
    return (f"针对 V1 差评中 Top 痛点（{'、'.join(top)}）全面重构的 V2 版本："
            f"以真实评论证据驱动参数级改进，主打「痛点清零 + 可验证升级」，"
            f"面向高频通勤/户外场景用户，用 Evidence 营销建立信任壁垒。")


def _selling_points(pain_points: list[dict], params) -> list[str]:
    pts = []
    for pp in pain_points[:5]:
        param = next((x for x in params if x.pain_point == pp["name"]), None)
        fix = param.recommended_state.split("（")[0].split("(")[0].strip() if param else "结构重构"
        pts.append(f"彻底解决{pp['display_name']}：{fix}（依据 {pp['review_count']} 条真实差评）")
    return pts


def analyze_product(df_clean: pd.DataFrame, product_id: str) -> dict:
    """对单个商品执行全链路分析，返回完整 artifact dict。"""
    df_p = df_clean[df_clean["product_id"] == product_id].copy()
    if df_p.empty:
        raise ValueError(f"product {product_id} not found")
    ptitle = str(df_p["product_title"].iloc[0])
    category = str(df_p["category"].iloc[0])
    data_source = str(df_p["data_source"].iloc[0])

    pain_points, clustered, cluster_meta = analyzer.mine_pain_points(df_p)

    # Agent 层：RootCause + ProductParams（heuristic 默认，LLM 可用时增强）
    review_lookup = df_p.set_index("review_id")[["rating", "review_text", "helpful_vote"]].to_dict("index")

    all_params = []
    root_causes = {}
    for pp in pain_points:
        samples = [dict(rating=review_lookup[rid]["rating"],
                        review_text=review_lookup[rid]["review_text"],
                        helpful_vote=review_lookup[rid]["helpful_vote"])
                   for rid in pp["evidence_review_ids"][:6] if rid in review_lookup]
        rc = root_cause.analyze_root_cause(pp, samples)
        root_causes[pp["name"]] = rc
        params = product_engineer.map_params(pp, rc.root_cause)
        params = product_engineer.refine_reasons_with_llm(params, pp, samples)
        all_params.extend(params)

    positioning = _positioning(ptitle, pain_points)
    before_after = _before_after_profile(pain_points, all_params)
    selling_points = _selling_points(pain_points, all_params)
    listing = listing_svc.generate_listing(ptitle, pain_points, all_params, positioning)

    artifact = {
        "product_id": product_id,
        "product_title": ptitle,
        "category": category,
        "data_source": data_source,
        "generated_at": _now(),
        "llm_mode": llm_mode(),
        "stats": {
            "total_reviews": int(len(df_p)),
            "negative_reviews": int((df_p["rating"] <= settings.NEGATIVE_MAX_RATING).sum()),
            "avg_rating": round(float(df_p["rating"].mean()), 2),
            "rating_distribution": _rating_distribution(df_p),
            "date_range": [str(df_p["timestamp"].min()), str(df_p["timestamp"].max())],
            "cluster_method": cluster_meta.get("method"),
            "n_clusters_raw": cluster_meta.get("k"),
        },
        "pain_points": pain_points,
        "root_causes": {k: v.model_dump() for k, v in root_causes.items()},
        "product_v2": {
            "positioning": positioning,
            "parameters": [p.model_dump() for p in all_params],
            "selling_points": selling_points,
            "before_after_profile": before_after,
        },
        "listing": listing.model_dump(),
    }
    return artifact


def save_artifact(artifact: dict) -> str:
    pid = artifact["product_id"]
    path = settings.ARTIFACTS_DIR / f"analysis_{_safe(pid)}.json"
    path.write_text(json.dumps(artifact, ensure_ascii=False, indent=2), encoding="utf-8")
    _update_index(artifact)
    log.info("分析产物已保存 -> %s（pain_points=%d, params=%d）",
             path, len(artifact["pain_points"]), len(artifact["product_v2"]["parameters"]))
    return str(path)


def _safe(pid: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in pid)


def _update_index(artifact: dict) -> None:
    idx_path = settings.ARTIFACTS_DIR / "products_index.json"
    index: dict = {}
    if idx_path.exists():
        try:
            index = json.loads(idx_path.read_text(encoding="utf-8"))
        except Exception:
            index = {}
    index[artifact["product_id"]] = {
        "analyzed_at": artifact["generated_at"],
        "pain_points": len(artifact["pain_points"]),
        "avg_rating": artifact["stats"]["avg_rating"],
        "total_reviews": artifact["stats"]["total_reviews"],
    }
    idx_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")


def select_demo_product(df_clean: pd.DataFrame) -> str:
    """优先水杯/保温杯品类中负面评论最多的商品；品类不足则取全局评论最多的商品。"""
    kw = df_clean["product_title"].str.lower().str.contains(
        "bottle|tumbler|thermos|flask", na=False) | df_clean["category"].str.lower().str.contains(
        "bottle|tumbler", na=False)
    neg = df_clean[df_clean["rating"] <= settings.NEGATIVE_MAX_RATING]
    cand = neg[neg["product_id"].isin(df_clean[kw]["product_id"].unique())]
    if cand.empty:
        cand = neg
    if cand.empty:
        cand = df_clean
    top = cand["product_id"].value_counts()
    hero = "B0DEMO0001" if (top.empty and "B0DEMO0001" in set(df_clean["product_id"])) else (
        top.index[0] if not top.empty else df_clean["product_id"].value_counts().index[0])
    return str(hero)
