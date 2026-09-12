"""数据访问层：DuckDB 查询 Parquet + 分析产物读写 + pipeline 触发。"""
from __future__ import annotations

import json
import logging
import threading

import duckdb
import pandas as pd

from backend.app.config import settings

log = logging.getLogger("r2p.store")

_lock = threading.Lock()
_df_cache: pd.DataFrame | None = None
_con: duckdb.DuckDBPyConnection | None = None


def run_pipeline_if_needed(force: bool = False) -> None:
    """产物缺失时自动跑 pipeline（保证一键启动 / API 首次访问即可用）。"""
    has_clean = (settings.PROCESSED_DIR / "reviews_clean.parquet").exists()
    has_artifacts = any(settings.ARTIFACTS_DIR.glob("analysis_*.json"))
    if force or not (has_clean and has_artifacts):
        log.info("检测到数据/产物缺失，自动执行 pipeline ...")
        from scripts.run_pipeline import main as pipeline_main
        pipeline_main()


def load_clean_df(force: bool = False) -> pd.DataFrame:
    global _df_cache
    with _lock:
        if _df_cache is None or force:
            path = settings.PROCESSED_DIR / "reviews_clean.parquet"
            if not path.exists():
                run_pipeline_if_needed(force=True)
            _df_cache = pd.read_parquet(path)
    return _df_cache


def con() -> duckdb.DuckDBPyConnection:
    global _con
    with _lock:
        if _con is None:
            _con = duckdb.connect()
            _con.execute(f"CREATE OR REPLACE VIEW reviews AS SELECT * FROM read_parquet('{_parquet_path()}')")
    return _con


def _parquet_path() -> str:
    path = settings.PROCESSED_DIR / "reviews_clean.parquet"
    if not path.exists():
        run_pipeline_if_needed(force=True)
    return str(path).replace("\\", "/")


def list_products() -> list[dict]:
    c = con()
    rows = c.execute("""
        SELECT product_id, any_value(product_title) AS product_title,
               any_value(category) AS category, avg(price) AS price,
               count(*) AS review_count,
               sum(CASE WHEN rating <= 3 THEN 1 ELSE 0 END) AS negative_count,
               avg(rating) AS avg_rating,
               any_value(data_source) AS data_source
        FROM reviews GROUP BY product_id ORDER BY review_count DESC
    """).fetchall()
    hero = _hero_product_id()
    analyzed = analyzed_product_ids()
    out = []
    for r in rows:
        out.append({
            "product_id": r[0], "product_title": r[1] or r[0], "category": r[2] or "unknown",
            "price": round(float(r[3]), 2) if r[3] is not None else None,
            "review_count": int(r[4]), "negative_count": int(r[5]),
            "avg_rating": round(float(r[6]), 2), "is_demo_hero": r[0] == hero,
            "analyzed": r[0] in analyzed, "data_source": r[7] or "unknown",
        })
    return out


def _hero_product_id() -> str | None:
    f = settings.ARTIFACTS_DIR / "hero_product.json"
    if f.exists():
        try:
            return json.loads(f.read_text(encoding="utf-8")).get("product_id")
        except Exception:
            return None
    return None


def analyzed_product_ids() -> set[str]:
    return {p.stem.replace("analysis_", "") for p in settings.ARTIFACTS_DIR.glob("analysis_*.json")}


def get_reviews(product_id: str, limit: int = 50, min_rating: float | None = None,
                max_rating: float | None = None, review_ids: list[str] | None = None) -> list[dict]:
    c = con()
    sql = "SELECT review_id, product_id, rating, review_title, review_text, helpful_vote, timestamp, data_source FROM reviews WHERE product_id = ?"
    params: list = [product_id]
    if min_rating is not None:
        sql += " AND rating >= ?"
        params.append(min_rating)
    if max_rating is not None:
        sql += " AND rating <= ?"
        params.append(max_rating)
    if review_ids:
        sql += f" AND review_id IN ({','.join('?' * len(review_ids))})"
        params.extend(review_ids)
    sql += " ORDER BY helpful_vote DESC, timestamp DESC LIMIT ?"
    params.append(int(limit))
    rows = c.execute(sql, params).fetchall()
    cols = ["review_id", "product_id", "rating", "review_title", "review_text",
            "helpful_vote", "timestamp", "data_source"]
    return [dict(zip(cols, r)) for r in rows]


def get_timeseries(product_id: str) -> list[dict]:
    """月度聚合：评论量、平均评分、负面数（供前端 Review Dynamics 图，全部真实数据）。"""
    c = con()
    rows = c.execute("""
        SELECT strftime(to_timestamp(timestamp), '%Y-%m') AS month,
               count(*) AS count,
               avg(rating) AS avg_rating,
               sum(CASE WHEN rating <= 3 THEN 1 ELSE 0 END) AS negative
        FROM reviews WHERE product_id = ?
        GROUP BY 1 ORDER BY 1
    """, [product_id]).fetchall()
    return [
        {"month": r[0], "count": int(r[1]),
         "avg_rating": round(float(r[2]), 3), "negative": int(r[3])}
        for r in rows
    ]


def load_analysis(product_id: str) -> dict | None:
    safe = "".join(ch if ch.isalnum() else "_" for ch in product_id)
    path = settings.ARTIFACTS_DIR / f"analysis_{safe}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def save_hero(product_id: str) -> None:
    (settings.ARTIFACTS_DIR / "hero_product.json").write_text(
        json.dumps({"product_id": product_id}, ensure_ascii=False), encoding="utf-8")
