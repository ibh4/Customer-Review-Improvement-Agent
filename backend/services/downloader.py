"""数据获取模块（公开免费数据优先，多级降级）。

获取优先级（不购买任何数据/API）：
1. 本地缓存：data/raw/*.jsonl|csv|parquet（曾下载过的公开数据）
2. HuggingFace 公开镜像（hf-mirror.com）下载 Amazon Reviews 2023 (McAuley Lab)
   完整小品类 All_Beauty（评论 326MB + 流式解析 meta 213MB，一次性缓存）：
   - 品类文件为乱序存储，头部采样即可获得按商品聚集的真实评论
   - 从 meta 流式解析 Top 商品的真实标题/价格
   - 最终只保留评论量最高的 ~25 个商品、<=25k 行（符合 Demo 规模）
3. Kaggle：需要 token，当前机器无 token 时直接跳过（不向用户索要）
4. 最终兜底：生成明确标记 data_source=synthetic_demo 的演示数据（300–1000 条）
   - README / UI / RUN_REPORT 均明确区分真实数据与 synthetic 数据
"""
from __future__ import annotations

import json
import logging
import random
import time
from collections import Counter
from pathlib import Path

import httpx
import pandas as pd

from backend.app.config import settings

log = logging.getLogger("r2p.downloader")

COLUMNS = ["review_id", "product_id", "product_title", "category", "rating",
           "review_title", "review_text", "helpful_vote", "price", "timestamp", "data_source"]

MIRROR = "https://hf-mirror.com"
REPO = "McAuley-Lab/Amazon-Reviews-2023"
CATEGORY = "All_Beauty"

DOWNLOAD_BUDGET_S = 900       # 整体下载预算
PASS1_MAX_ROWS = 1_500_000    # 计数阶段最多扫描行数
TOP_N_PRODUCTS = 25           # 保留评论最多的商品数
MAX_ROWS_OUT = 25_000         # 输出最大行数


def acquire_dataset() -> tuple[pd.DataFrame, str, str]:
    """返回 (df, source_name, note)。source: amazon_reviews_2023 | local_cache | synthetic_demo"""
    # 1) 本地缓存
    cached = _scan_local_cache()
    if cached is not None:
        df, note = cached
        return df, "local_cache", note

    # 2) HF 镜像：完整小品类 + meta 标题对齐
    try:
        df, note = _try_hf_direct()
        if df is not None and len(df) >= 500:
            return df, "amazon_reviews_2023", note
        log.warning("HF 获取数据不足，降级")
    except Exception as e:  # 任何网络/协议错误都降级，不中断
        log.warning("HF 镜像获取失败：%s", e)

    # 4) synthetic 兜底（明确标记，绝不冒充真实数据）
    df = generate_synthetic_demo()
    return df, "synthetic_demo", "所有公开源获取失败，已生成明确标记的 synthetic_demo 数据（仅保证流程演示）"


def _scan_local_cache() -> tuple[pd.DataFrame, str] | None:
    for p in sorted(settings.RAW_DIR.glob("*")):
        if p.suffix.lower() not in {".jsonl", ".json", ".csv", ".parquet"}:
            continue
        if p.stat().st_size > 60_000_000:  # 跳过完整品类原始文件（仅作子集缓存源）
            continue
        try:
            df = _read_any(p)
            if len(df) >= 500 and "review_text" in df.columns:
                src = "amazon_reviews_2023" if "amazon" in p.name.lower() else "local_cache"
                if "data_source" not in df.columns:
                    df["data_source"] = src
                return df, f"使用本地缓存 {p.name}"
        except Exception as e:
            log.warning("读取缓存 %s 失败：%s", p.name, e)
    return None


def _read_any(p: Path) -> pd.DataFrame:
    suffix = p.suffix.lower()
    if suffix == ".parquet":
        return pd.read_parquet(p)
    if suffix == ".csv":
        return pd.read_csv(p)
    rows = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return pd.DataFrame(rows)


def _range_get(url: str, start: int, end: int | None, timeout: float = 300.0) -> httpx.Response:
    headers = {"Accept-Encoding": "identity"}
    if end is not None:
        headers["Range"] = f"bytes={start}-{end}"
    elif start > 0:
        headers["Range"] = f"bytes={start}-"
    r = httpx.get(url, headers=headers, timeout=timeout, follow_redirects=True)
    r.raise_for_status()
    return r


def _download_reviews_file(url: str, out: Path) -> None:
    """流式下载完整品类评论文件到本地（显示进度）。"""
    t0 = time.time()
    with httpx.stream("GET", url, headers={"Accept-Encoding": "identity"},
                      timeout=300.0, follow_redirects=True) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        done = 0
        with open(out, "wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)
                done += len(chunk)
                if int(time.time() - t0) % 15 == 0:
                    log.info("下载评论文件 %.0f/%.0f MB (%.0f%%)...",
                             done / 1e6, total / 1e6, 100 * done / max(total, 1))
    log.info("评论文件下载完成：%.0f MB，用时 %.0fs", done / 1e6, time.time() - t0)


def _scan_top_products(path: Path) -> list[str]:
    """Pass1：统计评论量 Top 商品（文件乱序=随机样本，头部扫描即可）。"""
    t0 = time.time()
    counter: Counter = Counter()
    n = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if n >= PASS1_MAX_ROWS:
                break
            line = line.strip()
            if not line.startswith("{"):
                continue
            try:
                row = json.loads(line)
                counter[row["asin"]] += 1
                n += 1
            except Exception:
                continue
    top = [a for a, _ in counter.most_common(TOP_N_PRODUCTS * 4)]
    log.info("Pass1 扫描 %d 行 / %d 商品，用时 %.0fs，Top1=%s(%d)", n, len(counter),
             time.time() - t0, top[0] if top else "-", counter.most_common(1)[0][1] if top else 0)
    return top


def _extract_rows(path: Path, asins: set[str], per_product_cap: int = 3000) -> list[dict]:
    """Pass2：抽取目标商品的全部评论行。"""
    rows: list[dict] = []
    counts: Counter = Counter()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line.startswith("{"):
                continue
            # 快速预筛，避免全量 json 解析
            if '"asin":' not in line:
                continue
            try:
                row = json.loads(line)
            except Exception:
                continue
            a = row.get("asin")
            if a in asins and counts[a] < per_product_cap:
                rows.append({
                    "review_id": row.get("review_id") or f"{a}-{counts[a]}",
                    "product_id": a,
                    "product_title": a,
                    "category": CATEGORY,
                    "rating": row.get("rating") or 0,
                    "review_title": row.get("title") or "",
                    "review_text": row.get("text") or "",
                    "helpful_vote": row.get("helpful_vote") or 0,
                    "price": None,
                    "timestamp": row.get("timestamp") or 0,
                    "data_source": "amazon_reviews_2023",
                })
                counts[a] += 1
                if sum(counts.values()) >= MAX_ROWS_OUT:
                    break
    return rows


def _resolve_titles(asins: list[str]) -> dict[str, dict]:
    """流式扫描 meta 文件，解析目标 asin 的真实标题/价格（找到即止）。"""
    url = f"{MIRROR}/datasets/{REPO}/resolve/main/raw/meta_categories/meta_{CATEGORY}.jsonl"
    need = set(asins)
    found: dict[str, dict] = {}
    t0 = time.time()
    try:
        with httpx.stream("GET", url, headers={"Accept-Encoding": "identity"},
                          timeout=300.0, follow_redirects=True) as r:
            r.raise_for_status()
            buf = ""
            for chunk in r.iter_text(1 << 22):
                buf += chunk
                lines = buf.split("\n")
                buf = lines.pop()
                for line in lines:
                    if '"parent_asin"' not in line:
                        continue
                    for a in list(need):
                        if f'"parent_asin": "{a}"' in line:
                            try:
                                m = json.loads(line)
                                found[a] = {
                                    "title": (m.get("title") or a)[:180],
                                    "price": m.get("price"),
                                }
                            except Exception:
                                pass
                            need.discard(a)
                if not need:
                    break
                if time.time() - t0 > 420:
                    log.warning("meta 标题解析超时，已解析 %d/%d", len(found), len(asins))
                    break
    except Exception as e:
        log.warning("meta 流式解析失败（标题将使用 asin 兜底）：%s", e)
    log.info("meta 标题解析：%d/%d，用时 %.0fs", len(found), len(asins), time.time() - t0)
    return found


def _try_hf_direct() -> tuple[pd.DataFrame | None, str]:
    t_start = time.time()
    rev_url = f"{MIRROR}/datasets/{REPO}/resolve/main/raw/review_categories/{CATEGORY}.jsonl"
    rev_path = settings.RAW_DIR / f"amazon_{CATEGORY.lower()}_reviews.jsonl"

    if not rev_path.exists():
        log.info("开始下载 Amazon Reviews 2023 / %s（公开镜像 %s）...", CATEGORY, MIRROR)
        _download_reviews_file(rev_url, rev_path)
    if time.time() - t_start > DOWNLOAD_BUDGET_S:
        raise RuntimeError("下载超出时间预算")

    top = _scan_top_products(rev_path)
    titles = _resolve_titles(top[:TOP_N_PRODUCTS * 4])
    # 优先选择有真实标题的商品
    ranked = [a for a in top if a in titles][:TOP_N_PRODUCTS]
    if not ranked:
        ranked = top[:TOP_N_PRODUCTS]
    asins = set(ranked)
    rows = _extract_rows(rev_path, asins)
    if len(rows) < 500:
        raise RuntimeError(f"抽取行数不足: {len(rows)}")

    df = pd.DataFrame(rows)
    for a in ranked:
        t = titles.get(a, {})
        df.loc[df["product_id"] == a, "product_title"] = t.get("title", a)
        if t.get("price") is not None:
            df.loc[df["product_id"] == a, "price"] = t["price"]

    # 子集缓存（下次直接命中 tier-1）
    subset_path = settings.RAW_DIR / f"amazon_{CATEGORY.lower()}_subset.jsonl"
    df.to_json(subset_path, orient="records", lines=True, force_ascii=False)
    log.info("All_Beauty 真实数据子集：%d 行 / %d 商品 -> %s", len(df), df["product_id"].nunique(), subset_path)
    return df, (f"Amazon Reviews 2023 (McAuley Lab, {MIRROR}) / {CATEGORY} 品类，"
                f"扫描 Top 商品并抽取 {len(df)} 行真实评论，标题价格来自官方 meta 流式解析")


# ---------------------------------------------------------------------------
# Synthetic 演示数据生成器（data_source = synthetic_demo，绝不冒充真实数据）
# ---------------------------------------------------------------------------

def _syn_products() -> list[dict]:
    return [
        {"product_id": "B0DEMO0001", "product_title": "HydraPeak Pro Insulated Water Bottle 24oz - Leak-Proof Tumbler with Straw Lid",
         "category": "Water Bottles / Tumblers", "price": 29.99, "share": 0.42},
        {"product_id": "B0DEMO0002", "product_title": "AquaPure Sport Bottle 20oz BPA-Free",
         "category": "Water Bottles / Tumblers", "price": 15.99, "share": 0.11},
        {"product_id": "B0DEMO0003", "product_title": "TundraSip 30oz Travel Tumbler with Handle",
         "category": "Water Bottles / Tumblers", "price": 24.99, "share": 0.10},
        {"product_id": "B0DEMO0004", "product_title": "SipWell Glass Water Bottle 18oz with Sleeve",
         "category": "Water Bottles / Tumblers", "price": 19.99, "share": 0.08},
        {"product_id": "B0DEMO0005", "product_title": "FlexiGrip Squeeze Bottle 22oz - Gym Hydration",
         "category": "Water Bottles / Tumblers", "price": 12.99, "share": 0.08},
        {"product_id": "B0DEMO0006", "product_title": "KiddoSip Children's Water Bottle 14oz",
         "category": "Water Bottles / Tumblers", "price": 14.99, "share": 0.07},
        {"product_id": "B0DEMO0007", "product_title": "MountainSteel Vacuum Thermos 40oz",
         "category": "Water Bottles / Tumblers", "price": 34.99, "share": 0.07},
        {"product_id": "B0DEMO0008", "product_title": "UrbanCarry Coffee Tumbler 26oz Flat Lid",
         "category": "Water Bottles / Tumblers", "price": 22.99, "share": 0.07},
    ]


# 痛点短语库（负面评论生成模板，贴近真实差评语言）
_PAIN_BANK: dict[str, dict] = {
    "Leakage": {
        "w": 0.20, "ratings": [1, 1, 1, 2, 2, 3], "helpful": (8, 130),
        "titles": ["Leaks in my bag", "Not leakproof at all", "Water everywhere", "Leaked all over my backpack",
                   "Straw hole drips constantly", "Seal failed after a week", "Do not put it in a bag!"],
        "texts": [
            "The lid leaks no matter how tight I screw it on. Ended up with a wet laptop after my commute.",
            "It drips from the straw hole whenever the bottle tips over. My car seat is soaked.",
            "Water seeps out of the seal within minutes of lying flat in my gym bag. Ruined my notebooks.",
            "No matter what I do, it leaks around the threads. Tried three different gaskets, still wet.",
            "Used it twice and the seal already failed. Had it sideways in my tote and everything got damp.",
        ],
    },
    "Cleaning Difficulty": {
        "w": 0.16, "ratings": [1, 2, 2, 2, 3, 3], "helpful": (5, 90),
        "titles": ["Hard to clean", "Mold in the lid", "Impossible to clean the straw", "Too many crevices",
                   "Smells after a week", "Can't disassemble the lid"],
        "texts": [
            "The lid has too many crevices where gunk builds up. Took me 10 minutes with a brush and it's still not clean.",
            "Mold started growing under the seal after two weeks. I can't even remove the gasket to scrub it.",
            "The straw is impossible to clean properly. I bought special brushes and still can't reach inside.",
            "You cannot take the lid apart, so smoothie residue just sits in there. Started smelling bad.",
            "Wish the lid came apart like my old bottle. As it is, it's a bacteria farm.",
        ],
    },
    "Cup Holder Fit": {
        "w": 0.11, "ratings": [2, 2, 3, 3, 1], "helpful": (3, 60),
        "titles": ["Doesn't fit my car cup holder", "Too wide for cup holders", "Wobbles in the holder",
                   "Base is too big"],
        "texts": [
            "The base is too wide for my car's cup holder. It wobbles and almost falls out on every turn.",
            "Doesn't fit a standard cup holder, so I have to hold it while driving. Pretty annoying.",
            "Check the diameter before buying - it does not fit any of my holders, car or treadmill.",
            "Fits my truck but not my sedan. Would love a tapered bottom version.",
        ],
    },
    "Insulation Performance": {
        "w": 0.12, "ratings": [1, 2, 2, 3, 3], "helpful": (4, 80),
        "titles": ["Doesn't keep drinks cold", "Ice melts in 2 hours", "Coffee goes lukewarm fast",
                   "Not as insulated as claimed"],
        "texts": [
            "Ice melts within two hours, nowhere near the 24 hours advertised. My cheap bottle performs better.",
            "My coffee is lukewarm by the time I get to work. The insulation is just not there.",
            "Expected cold water at the gym, got room temperature. Disappointed given the price.",
            "Sweats like crazy and loses cold fast. The vacuum layer seems defective.",
        ],
    },
    "Lid & Straw Mechanism": {
        "w": 0.11, "ratings": [1, 2, 2, 2, 3], "helpful": (4, 70),
        "titles": ["Lid broke within a month", "Straw cracked", "Flip lid is flimsy", "Hard to open",
                   "Hinge snapped"],
        "texts": [
            "The flip lid hinge snapped after three weeks of normal use. Now it won't stay closed.",
            "Straw cracked at the joint where it attaches. My kid was using it, not ideal.",
            "The button gets stuck and the lid is really hard to open one-handed.",
            "Lid feels flimsy and cheap compared to the rest of the bottle. Brope after a few drops.",
        ],
    },
    "Odor & Taste": {
        "w": 0.08, "ratings": [1, 2, 2, 3], "helpful": (3, 55),
        "titles": ["Plastic smell won't go away", "Weird taste", "Chemical odor out of the box"],
        "texts": [
            "Strong plastic smell out of the box that won't go away after weeks of washing. Water tastes off.",
            "There's a chemical taste in every sip. I've boiled it, baked it, vinegar-soaked it. Still there.",
            "The silicone gasket smells like a warehouse. My water picks up the taste immediately.",
        ],
    },
    "Durability": {
        "w": 0.09, "ratings": [1, 2, 2, 3], "helpful": (3, 65),
        "titles": ["Dented after one drop", "Paint chipping off", "Broke within a month"],
        "texts": [
            "Dropped it once from the counter and it dented so badly it wobbles on the table now.",
            "The powder coating started chipping within a month. Looks years old already.",
            "Not durable at all. The bottom rim bent in and now it doesn't sit flat.",
        ],
    },
    "Size & Capacity": {
        "w": 0.07, "ratings": [2, 3, 3, 2], "helpful": (2, 40),
        "titles": ["Too big for my backpack", "Smaller than expected", "Bulky for everyday carry"],
        "texts": [
            "It's too tall for my backpack side pocket. Fine for the car, annoying everywhere else.",
            "Feels bulky and heavy when full. Wish they had a smaller size option.",
            "The 24oz is bigger in person than in the photos. Check dimensions carefully.",
        ],
    },
    "Value & Price": {
        "w": 0.06, "ratings": [2, 2, 3, 1], "helpful": (2, 50),
        "titles": ["Overpriced for the quality", "Not worth the money", "Expected more at this price"],
        "texts": [
            "Overpriced for what you get. The issues it has are unacceptable at this price point.",
            "Not worth the money. My $10 bottle from the supermarket does the same job without leaking.",
            "You're paying for the brand. Quality control is all over the place.",
        ],
    },
}

_POS_BANK = {
    "titles": ["Keeps water cold all day", "Perfect for the gym", "Love this bottle", "Great quality for the price",
               "Best bottle I've owned", "Solid everyday bottle", "Exactly what I needed", "Holds up great"],
    "texts": [
        "Keeps my water ice cold through my entire shift. The lid seals perfectly so far.",
        "Perfect size for the gym and it fits my car holder. Colors look even better in person.",
        "Three months in and no leaks, no dents. Washing it is quick and easy.",
        "Bought two more for my kids. The straw lid is convenient and the handle feels sturdy.",
        "Great value. Cold for 20+ hours on road trips, and the powder coat still looks new.",
    ],
}

# 负面评论随机补充句（增大组合多样性，降低去重损耗）
_NEG_EXTRAS = [
    "I really wanted to love this.", "Bought it based on the good reviews, sadly disappointed.",
    "This was my second one and both had issues.", "Contacted the seller, still waiting for a reply.",
    "Used it daily for about three weeks before giving up.", "Maybe I got a defective unit.",
    "My previous bottle from another brand never had this problem.", "Honestly expected better at this price.",
    "Two stars because the color is nice at least.", "Returning it this weekend.",
    "Would not recommend to daily commuters.", "It started fine, then problems showed up quickly.",
]


def generate_synthetic_demo(n_total: int = 950, seed: int = 42) -> pd.DataFrame:
    """生成明确标记为 synthetic_demo 的演示数据。所有统计量（评分分布等）均由生成数据真实计算。"""
    rng = random.Random(seed)
    products = _syn_products()

    now_ms = int(time.time() * 1000)
    two_years_ms = 730 * 24 * 3600 * 1000

    pains = list(_PAIN_BANK.items())
    pain_names = [p[0] for p in pains]
    pain_ws = [p[1]["w"] for p in pains]

    rows: list[dict] = []
    rid = 0
    for prod in products:
        n_prod = int(n_total * prod["share"])
        # 评分结构：整体偏正（贴近电商真实分布），负面集中在痛点库
        for _ in range(n_prod):
            rid += 1
            ts = now_ms - rng.randint(0, two_years_ms)
            if rng.random() < 0.52:  # 正面评论（4-5星）
                rating = 5 if rng.random() < 0.68 else 4
                title = rng.choice(_POS_BANK["titles"])
                text = rng.choice(_POS_BANK["texts"])
                if rng.random() < 0.35:
                    text += " " + rng.choice(
                        ["Would buy again.", "Highly recommend.", "Buying another one for my partner.",
                         "Gifted one to my sister and she loves it."])
                helpful = rng.randint(0, 25)
            else:  # 负面评论，按痛点权重生成
                pname = rng.choices(pain_names, weights=pain_ws, k=1)[0]
                bank = _PAIN_BANK[pname]
                rating = rng.choice(bank["ratings"])
                title = rng.choice(bank["titles"])
                text = rng.choice(bank["texts"])
                if rng.random() < 0.75:
                    text += " " + rng.choice(_NEG_EXTRAS)
                if rng.random() < 0.25:
                    text += " " + rng.choice(_NEG_EXTRAS)
                helpful = rng.randint(*bank["helpful"])
            rows.append({
                "review_id": f"r{rid:05d}",
                "product_id": prod["product_id"],
                "product_title": prod["product_title"],
                "category": prod["category"],
                "rating": rating,
                "review_title": title,
                "review_text": text,
                "helpful_vote": helpful,
                "price": prod["price"],
                "timestamp": ts,
                "data_source": "synthetic_demo",
            })

    df = pd.DataFrame(rows, columns=COLUMNS)
    out = settings.DEMO_DIR / "reviews_demo.csv"
    df.to_csv(out, index=False)
    log.info("synthetic demo 数据已生成：%d 行 -> %s", len(df), out)
    return df
