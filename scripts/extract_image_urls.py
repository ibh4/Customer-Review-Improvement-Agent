"""从已下载的元数据中提取 25 个商品的图片 URL，输出清单（不下载图片）。"""
from __future__ import annotations

import gzip
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
META = ROOT / "data" / "raw" / "meta_All_Beauty.jsonl.gz"
OUT = ROOT / "data" / "raw" / "product_image_urls.txt"

ASINS = [
    "B07C533XCW", "B00R1TAN7I", "B019GBG0IE", "B08L5KN7X4", "B0107QYW14",
    "B012Q9NGE4", "B07ZJKVVLW", "B005BZQHEC", "B074KD4PX2", "B08B1PR9C7",
    "B004H5D40W", "B06Y44MMT6", "B000FEF1V4", "B000GBMYC0", "B01DUYNJL4",
    "B005IYYF5E", "B08RNQNFW1", "B00DT4757A", "B01BJCLNIA", "B07G19ZXWB",
    "B00MZT4UEG", "B000FEIOHW", "B01IMEH6GG", "B000X20Y4C", "B01195J43I",
]


def main() -> int:
    if not META.exists():
        print(f"metadata not ready: {META}")
        return 1
    todo = set(ASINS)
    found: dict[str, str] = {}
    with gzip.open(META, "rt", encoding="utf-8") as f:
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
            for img in meta.get("images") or []:
                if isinstance(img, dict) and (img.get("large") or img.get("hi_res")):
                    found[asin] = img.get("hi_res") or img.get("large")
                    todo.discard(asin)
                    break
    lines = [f"{a}\t{found[a]}" for a in ASINS if a in found]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"found {len(found)}/{len(ASINS)} -> {OUT}")
    for l in lines:
        print(l)
    return 0


if __name__ == "__main__":
    sys.exit(main())
