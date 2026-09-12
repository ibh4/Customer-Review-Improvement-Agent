"""一次性脚本：从 Amazon Reviews 2023 (McAuley) 元数据中提取 25 个商品的
真实主图 URL 并下载到 frontend/public/products/{ASIN}.jpg。

元数据与项目评论数据同源（All_Beauty 品类），保证图片与商品一一对应。
用法: .venv python scripts/fetch_product_images.py
"""
from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "frontend" / "public" / "products"
META_URL = "https://mcauleylab.ucsd.edu/public_datasets/data/amazon_2023/raw/meta_categories/meta_All_Beauty.jsonl.gz"

ASINS = [
    "B07C533XCW", "B00R1TAN7I", "B019GBG0IE", "B08L5KN7X4", "B0107QYW14",
    "B012Q9NGE4", "B07ZJKVVLW", "B005BZQHEC", "B074KD4PX2", "B08B1PR9C7",
    "B004H5D40W", "B06Y44MMT6", "B000FEF1V4", "B000GBMYC0", "B01DUYNJL4",
    "B005IYYF5E", "B08RNQNFW1", "B00DT4757A", "B01BJCLNIA", "B07G19ZXWB",
    "B00MZT4UEG", "B000FEIOHW", "B01IMEH6GG", "B000X20Y4C", "B01195J43I",
]


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    todo = {a for a in ASINS if not (OUT_DIR / f"{a}.jpg").exists()}
    if not todo:
        print("all images already downloaded")
        return 0

    print(f"downloading metadata (~37MB) for {len(todo)} ASINs ...")
    image_urls: dict[str, str] = {}
    tmp = ROOT / "data" / "raw" / "meta_All_Beauty.jsonl.gz"
    tmp.parent.mkdir(parents=True, exist_ok=True)
    if not tmp.exists():
        with httpx.stream("GET", META_URL, timeout=300.0, follow_redirects=True) as resp:
            resp.raise_for_status()
            with open(tmp, "wb") as fh:
                for chunk in resp.iter_bytes(1 << 20):
                    fh.write(chunk)
        print(f"metadata saved: {tmp.stat().st_size // 1024 // 1024}MB")
    with gzip.open(tmp, "rt", encoding="utf-8") as f:
        for line in f:
            if not todo:
                break
            if '"parent_asin"' not in line:
                continue
            try:
                meta = json.loads(line)
            except json.JSONDecodeError:
                continue
            asin = meta.get("parent_asin")
            if asin not in todo:
                continue
            imgs = meta.get("images") or []
            url = None
            for img in imgs:
                if isinstance(img, dict) and img.get("large"):
                    url = img["large"]
                    break
                if isinstance(img, dict) and img.get("hi_res"):
                    url = img["hi_res"]
                    break
            if url:
                image_urls[asin] = url
                todo.discard(asin)

    print(f"found {len(image_urls)} / {len(ASINS)} image urls")
    ok = fail = 0
    with httpx.Client(timeout=30.0, follow_redirects=True,
                      headers={"User-Agent": "Mozilla/5.0"}) as client:
        for asin, url in image_urls.items():
            try:
                r = client.get(url)
                r.raise_for_status()
                if len(r.content) < 2000:
                    print(f"  {asin}: too small ({len(r.content)}B), skip")
                    fail += 1
                    continue
                (OUT_DIR / f"{asin}.jpg").write_bytes(r.content)
                ok += 1
                print(f"  {asin}: {len(r.content) // 1024}KB")
            except Exception as e:
                fail += 1
                print(f"  {asin}: FAIL {e}")

    missing = [a for a in ASINS if not (OUT_DIR / f"{a}.jpg").exists()]
    print(f"done. ok={ok} fail={fail} missing={missing}")
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
