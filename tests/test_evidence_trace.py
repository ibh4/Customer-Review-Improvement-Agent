"""Evidence 可追溯性测试：任何结论都能回溯到真实评论。"""
import pandas as pd

from backend.services.analyzer import extract_evidence, mine_pain_points


def test_evidence_ids_exist_in_product(clean_df, hero_pid):
    df_p = clean_df[clean_df["product_id"] == hero_pid]
    valid_ids = set(df_p["review_id"])
    pains, _, _ = mine_pain_points(df_p)
    for p in pains:
        for rid in p["evidence_review_ids"]:
            assert rid in valid_ids, f"Evidence {rid} 必须来自该商品的真实评论"


def test_evidence_sorted_by_helpfulness(clean_df):
    df = clean_df[clean_df["product_id"] == clean_df["product_id"].iloc[0]].copy()
    ids = extract_evidence(df, list(df.index), n=5)
    helpful = df.set_index("review_id")["helpful_vote"]
    top5 = sorted(helpful.items(), key=lambda x: -x[1])[:5]
    assert all(rid in {t[0] for t in top5} for rid in ids)


def test_insufficient_evidence_flag():
    df = pd.DataFrame({
        "review_id": [f"r{i}" for i in range(5)],
        "product_id": ["P"] * 5,
        "rating": [1.0] * 5,
        "review_title": ["meh"] * 5,
        "review_text": ["not great not terrible honestly"] * 5,
        "helpful_vote": [0] * 5,
        "timestamp": [1700000000] * 5,
        "language": ["en"] * 5,
    })
    pains, _, _ = mine_pain_points(df)
    for p in pains:
        status = "ok" if p["evidence_review_ids"] else "insufficient_evidence"
        assert p["evidence_status"] == status


def test_evidence_review_content_matches_pain(clean_df, hero_pid):
    """抽查：痛点 Evidence 的文本应包含该痛点关键词或属于负面评论。"""
    df_p = clean_df[clean_df["product_id"] == hero_pid].set_index("review_id")
    pains, _, _ = mine_pain_points(df_p.reset_index())
    checked = 0
    for p in pains:
        for rid in p["evidence_review_ids"][:3]:
            row = df_p.loc[rid]
            kw_hit = any(k in (row["review_title"] + row["review_text"]).lower() for k in p["keywords"])
            assert kw_hit or row["rating"] <= 3, "Evidence 应与痛点相关或为负面评论"
            checked += 1
    assert checked >= 6
