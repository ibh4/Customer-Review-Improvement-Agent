"""数据管道测试：清洗 / 去重 / 评分标准化 / 语言检测 / Parquet 缓存。"""
import pandas as pd

from backend.services import downloader, preprocess


def test_synthetic_generator_marks_source():
    df = downloader.generate_synthetic_demo(n_total=120, seed=1)
    assert (df["data_source"] == "synthetic_demo").all(), "synthetic 数据必须全部标记 synthetic_demo"
    assert set(downloader.COLUMNS).issubset(df.columns)


def test_preprocess_dedup_and_clean(clean_df):
    df = clean_df
    assert not df.duplicated(subset=["product_id", "review_text"]).any(), "去重后不应存在重复评论"
    assert df["rating"].between(1, 5).all(), "评分必须在 1-5"
    assert (df["review_text"].str.len() >= 10).all(), "过短文本应被清理"
    assert df["language"].isin(["en", "other", "unknown"]).all()


def test_preprocess_handles_dirty_rows():
    dirty = pd.DataFrame([
        {"review_id": "x1", "product_id": "P1", "product_title": "T", "category": "c", "rating": 9,
         "review_title": "t", "review_text": "  <b>leaks</b> everywhere http://x.co  ", "helpful_vote": -3,
         "price": None, "timestamp": 1700000000000, "data_source": "synthetic_demo"},
        {"review_id": "x2", "product_id": "P1", "product_title": "T", "category": "c", "rating": None,
         "review_title": "t", "review_text": "broken after one drop", "helpful_vote": 1,
         "price": 9.9, "timestamp": None, "data_source": "synthetic_demo"},
        {"review_id": "x1", "product_id": "P1", "product_title": "T", "category": "c", "rating": 1,
         "review_title": "t", "review_text": "  <b>leaks</b> everywhere http://x.co", "helpful_vote": 2,
         "price": None, "timestamp": 1700000000000, "data_source": "synthetic_demo"},
    ])
    out, stats = preprocess.preprocess(dirty)
    assert "http" not in out["review_text"].iloc[0] and "<b>" not in out["review_text"].iloc[0]
    assert stats["duplicates_removed"] == 1, "重复评论应被去掉 1 条"
    assert (out["helpful_vote"] >= 0).all()
    assert out["rating"].between(1, 5).all(), "越界评分应被裁剪"


def test_parquet_roundtrip(clean_df, tmp_path):
    from backend.services.preprocess import save_parquet
    path = save_parquet(clean_df, tmp_path / "t.parquet")
    back = pd.read_parquet(path)
    assert len(back) == len(clean_df)
    assert list(back.columns) == list(clean_df.columns)
