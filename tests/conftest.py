import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.services import downloader, preprocess  # noqa: E402


@pytest.fixture(scope="session")
def clean_df() -> pd.DataFrame:
    """内存中的小规模 synthetic 数据集（不落盘、不依赖网络）。"""
    df_raw = downloader.generate_synthetic_demo(n_total=420, seed=7)
    df, _ = preprocess.preprocess(df_raw)
    return df


@pytest.fixture(scope="session")
def hero_pid(clean_df) -> str:
    from backend.services.analysis import select_demo_product
    return select_demo_product(clean_df)
