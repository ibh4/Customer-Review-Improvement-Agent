"""聚类测试：TF-IDF+KMeans 挖掘 >=3 个痛点，指标合法。"""
import pandas as pd

from backend.services import downloader, preprocess
from backend.services.analyzer import mine_pain_points


def test_mine_pain_points(clean_df, hero_pid):
    df_p = clean_df[clean_df["product_id"] == hero_pid]
    pains, clustered, meta = mine_pain_points(df_p)
    assert len(pains) >= 3, "Demo 商品应至少产生 3 个痛点"
    total_share = sum(p["share"] for p in pains)
    assert 0.5 < total_share <= 1.05, f"痛点占比总和异常: {total_share}"
    for p in pains:
        assert p["review_count"] >= 1
        assert 0 <= p["pain_score"] <= 100
        assert 1.0 <= p["avg_rating"] <= 3.0, "负面聚类平均分应在 1-3 星"
        assert p["name"] and p["display_name"]
        assert p["evidence_review_ids"], f"痛点 {p['name']} 必须有 Evidence"
    assert meta["method"] in {"tfidf_kmeans", "embedding_kmeans", "single_cluster"}


def test_cluster_assignments_consistent(clean_df, hero_pid):
    df_p = clean_df[clean_df["product_id"] == hero_pid]
    pains1, _, _ = mine_pain_points(df_p)
    pains2, _, _ = mine_pain_points(df_p)
    n1 = [p["review_count"] for p in pains1]
    n2 = [p["review_count"] for p in pains2]
    assert n1 == n2, "固定 random_state 下聚类应可复现"


def test_tiny_negative_set_single_cluster():
    df = pd.DataFrame({
        "review_id": [f"r{i}" for i in range(6)],
        "product_id": ["P"] * 6,
        "rating": [1.0] * 6,
        "review_title": ["bad"] * 6,
        "review_text": ["it leaks a lot and broke"] * 6,
        "helpful_vote": [0] * 6,
        "timestamp": [1700000000] * 6,
        "language": ["en"] * 6,
    })
    df["review_title"] = df["review_title"].fillna("")
    pains, _, meta = mine_pain_points(df)
    assert meta["method"] == "single_cluster"
    assert len(pains) >= 1
