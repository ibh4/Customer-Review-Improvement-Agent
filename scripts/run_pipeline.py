"""Review2Product 一键 Pipeline：

  acquire（公开数据/缓存/synthetic 降级）
    -> preprocess（清洗/去重/语言检测/Parquet 缓存）
    -> analyze（hero 商品全链路分析）
    -> artifacts（analysis JSON + hero_product + pipeline_run 摘要）

用法：python scripts/run_pipeline.py [--force] [--rows N]
"""
from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path

# 保证可从仓库根目录以包形式导入
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.app.config import settings  # noqa: E402
from backend.services import analysis as analysis_svc  # noqa: E402
from backend.services import downloader, preprocess  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("r2p.pipeline")


def main(force: bool = False, max_rows: int | None = None) -> dict:
    t0 = time.time()
    report: dict = {"started_at": time.strftime("%Y-%m-%d %H:%M:%S")}

    # 1) 获取数据 ------------------------------------------------------------
    settings.ensure_dirs()
    parquet = settings.PROCESSED_DIR / "reviews_clean.parquet"
    if parquet.exists() and not force:
        import pandas as pd
        log.info("使用已缓存清洗数据 %s（--force 重新获取）", parquet)
        df_clean = pd.read_parquet(parquet)
        meta = json.loads((settings.ARTIFACTS_DIR / "pipeline_run.json").read_text(encoding="utf-8")) \
            if (settings.ARTIFACTS_DIR / "pipeline_run.json").exists() else {}
        source = meta.get("data_source", "local_cache")
        note = meta.get("acquire_note", "cached parquet")
        stats = {k: meta.get(k) for k in ("rows_loaded", "rows_processed", "products", "negative_reviews")}
    else:
        if max_rows:
            settings.MAX_PUBLIC_ROWS = max_rows
        df_raw, source, note = downloader.acquire_dataset()
        df_clean, stats = preprocess.preprocess(df_raw)
        preprocess.save_parquet(df_clean)
        # 原始样本留档（synthetic 直接落 demo 目录）
        if source == "synthetic_demo":
            stats["demo_csv"] = str(settings.DEMO_DIR / "reviews_demo.csv")
        log.info("数据源=%s | %s", source, note)

    report.update({"data_source": source, "acquire_note": note, **stats})
    report["reviews_total"] = int(len(df_clean))

    # 2) 选择 Demo 商品并分析 --------------------------------------------------
    hero = analysis_svc.select_demo_product(df_clean)
    log.info("Demo hero 商品：%s", hero)
    artifact = analysis_svc.analyze_product(df_clean, hero)
    analysis_svc.save_artifact(artifact)
    store_hero(hero)

    report.update({
        "hero_product_id": hero,
        "hero_product_title": artifact["product_title"],
        "pain_points": len(artifact["pain_points"]),
        "pain_point_names": [p["name"] for p in artifact["pain_points"]],
        "v2_parameters": len(artifact["product_v2"]["parameters"]),
        "listing_bullets": len(artifact["listing"]["bullets"]),
        "llm_mode": artifact["llm_mode"],
    })

    report["elapsed_s"] = round(time.time() - t0, 1)
    report["status"] = "ok"
    (settings.ARTIFACTS_DIR / "pipeline_run.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("Pipeline 完成：%s", json.dumps({k: report[k] for k in
              ("data_source", "reviews_total", "hero_product_id", "pain_points", "elapsed_s")},
              ensure_ascii=False))
    return report


def store_hero(pid: str) -> None:
    (settings.ARTIFACTS_DIR / "hero_product.json").write_text(
        json.dumps({"product_id": pid}, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="重新获取并清洗数据")
    ap.add_argument("--rows", type=int, default=None, help="公开数据最大行数")
    args = ap.parse_args()
    main(force=args.force, max_rows=args.rows)
