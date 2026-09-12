"""全局配置：路径、LLM、数据源、算法开关。所有配置均可通过 .env 覆盖。"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]  # review2product/
load_dotenv(BASE_DIR / ".env")


class Settings:
    # 路径
    BASE_DIR = BASE_DIR
    DATA_DIR = BASE_DIR / "data"
    RAW_DIR = DATA_DIR / "raw"
    PROCESSED_DIR = DATA_DIR / "processed"
    DEMO_DIR = DATA_DIR / "demo"
    MODELS_DIR = BASE_DIR / "models"
    ARTIFACTS_DIR = BASE_DIR / "artifacts"

    # LLM（禁止把 Key 写进代码，只从环境读取）
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "mock").strip().lower()  # mock | dashscope | openai
    LLM_API_KEY = os.getenv("LLM_API_KEY", "").strip()
    LLM_MODEL = os.getenv("LLM_MODEL", "qwen3.8max").strip()
    LLM_BASE_URL = os.getenv("LLM_BASE_URL", "").strip()

    # 数据获取
    HF_ENDPOINT = os.getenv("HF_ENDPOINT", "https://hf-mirror.com").strip()
    MAX_PUBLIC_ROWS = int(os.getenv("MAX_PUBLIC_ROWS", "15000"))

    # 算法
    ENABLE_EMBEDDINGS = os.getenv("ENABLE_EMBEDDINGS", "0") == "1"
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

    # 服务
    BACKEND_PORT = int(os.getenv("BACKEND_PORT", "8000"))
    FRONTEND_PORT = int(os.getenv("FRONTEND_PORT", "5173"))

    # 分析常量
    NEGATIVE_MAX_RATING = 3          # 1-3 星视为负面
    MAX_KMEANS_K = 8
    MIN_CLUSTER_SIZE = 3
    EVIDENCE_TOP_N = 50

    @classmethod
    def ensure_dirs(cls) -> None:
        for d in (cls.RAW_DIR, cls.PROCESSED_DIR, cls.DEMO_DIR, cls.MODELS_DIR, cls.ARTIFACTS_DIR):
            d.mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_dirs()
