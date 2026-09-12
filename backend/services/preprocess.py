"""数据清洗与标准化：缺失值、去重、文本清洗、评分标准化、语言检测、负面筛选、Parquet 缓存。"""
from __future__ import annotations

import logging
import re

import pandas as pd

from backend.app.config import settings

log = logging.getLogger("r2p.preprocess")

TEXT_RE_HTML = re.compile(r"<[^>]+>")
TEXT_RE_URL = re.compile(r"https?://\S+|www\.\S+")
TEXT_RE_WS = re.compile(r"\s+")

# 常见英文功能词，用于轻量语言检测
_EN_MARKERS = (" the ", " and ", " was ", " is ", " it ", " this ", " for ", " with ", " my ", " not ", " but ")


def detect_language(text: str) -> str:
    """轻量语言检测：ASCII 占比 + 常见英文标记词，足够 Demo 使用。"""
    if not text:
        return "unknown"
    t = text.lower()
    if any(m in t for m in _EN_MARKERS):
        return "en"
    ascii_ratio = sum(1 for c in t if ord(c) < 128) / max(len(t), 1)
    return "en" if ascii_ratio > 0.9 else "other"


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ""
    t = TEXT_RE_HTML.sub(" ", text)
    t = TEXT_RE_URL.sub(" ", t)
    t = TEXT_RE_WS.sub(" ", t).strip()
    return t


def preprocess(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """输入统一/清洗后的数据，输出干净数据与统计信息。"""
    stats: dict = {"rows_loaded": int(len(df))}

    # 列对齐
    for col in ("review_title", "helpful_vote", "price"):
        if col not in df.columns:
            df[col] = None
    df["review_title"] = df["review_title"].fillna("").astype(str)
    df["review_text"] = df["review_text"].fillna("").astype(str)

    # 评分标准化
    df["rating"] = pd.to_numeric(df["rating"], errors="coerce")
    df["helpful_vote"] = pd.to_numeric(df["helpful_vote"], errors="coerce").fillna(0).clip(lower=0).astype(int)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["timestamp"] = pd.to_numeric(df["timestamp"], errors="coerce")
    df = df.dropna(subset=["rating"])
    df["rating"] = df["rating"].clip(1, 5)

    # 缺失值清理
    df = df[df["review_text"].str.len() >= 10]
    df["category"] = df.get("category", pd.Series(["unknown"] * len(df))).fillna("unknown")
    df["product_title"] = df.get("product_title", pd.Series([""] * len(df))).fillna("")
    df["data_source"] = df.get("data_source", pd.Series(["unknown"] * len(df))).fillna("unknown").astype(str)
    stats["rows_after_null"] = int(len(df))

    # review_id 兜底
    if "review_id" not in df.columns or df["review_id"].isna().all():
        df["review_id"] = [f"r{i:06d}" for i in range(len(df))]
    df["review_id"] = df["review_id"].astype(str)

    # 文本清洗（保留原文本用于展示，另建清洗列用于建模）
    df["review_text"] = df["review_text"].map(clean_text)
    df["review_title"] = df["review_title"].map(clean_text)

    # 去重（同商品同文本）
    before = len(df)
    df = df.drop_duplicates(subset=["product_id", "review_text"], keep="first")
    stats["duplicates_removed"] = int(before - len(df))

    # 语言检测
    df["language"] = (df["review_title"] + " " + df["review_text"]).map(detect_language)

    # 时间戳：ms epoch -> s epoch
    df["timestamp"] = df["timestamp"].fillna(0).astype("int64")
    med = int(df.loc[df["timestamp"] > 0, "timestamp"].median()) if (df["timestamp"] > 0).any() else 0
    df.loc[df["timestamp"] <= 0, "timestamp"] = med
    df["timestamp"] = df["timestamp"].where(df["timestamp"] < 10_000_000_000, df["timestamp"] // 1000)

    df = df.reset_index(drop=True)
    stats["rows_processed"] = int(len(df))
    stats["products"] = int(df["product_id"].nunique())
    stats["avg_rating"] = round(float(df["rating"].mean()), 2)
    stats["negative_reviews"] = int((df["rating"] <= settings.NEGATIVE_MAX_RATING).sum())
    return df, stats


def save_parquet(df: pd.DataFrame, path=None) -> str:
    path = path or (settings.PROCESSED_DIR / "reviews_clean.parquet")
    df.to_parquet(path, index=False)
    log.info("清洗数据已缓存 -> %s（%d 行）", path, len(df))
    return str(path)
