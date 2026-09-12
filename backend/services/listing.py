"""Listing 生成：Product V2 → 卖点 / 标题 / Bullets / FAQ / 主图策略 / 营销信息。

规则模板（heuristic 默认）+ LLM 增强（可选）。全部卖点均携带 Evidence 引用。
"""
from __future__ import annotations

import logging

from pydantic import BaseModel

from backend.services.llm import get_llm

log = logging.getLogger("r2p.listing")

# 痛点 -> 英文卖点短语（Listing 面向海外买家，必须全英文）
FIX_EN = {
    "Leakage": "dual-seal leak-proof lid",
    "Cleaning Difficulty": "fully detachable easy-clean lid",
    "Cup Holder Fit": "tapered cup-holder-ready base",
    "Insulation Performance": "reinforced vacuum insulation",
    "Lid & Straw Mechanism": "reinforced lid hinge & flexible straw",
    "Odor & Taste": "food-grade odor-free materials",
    "Durability": "impact-resistant coating & thicker walls",
    "Size & Capacity": "multi-size capacity options",
    "Value & Price": "upgrades that justify every cent",
    "Shipping & Packaging": "crush-resistant protective packaging",
    "Not As Described": "true-to-photo listing accuracy",
    "Condensation": "full-length vacuum & thermal-break ring",
    "Skin Reaction": "fragrance-free sensitive-skin formula",
    "Drying & Clogging": "anti-clog airtight pump system",
    "Shade Mismatch": "true-tone multi-skin-tone swatches",
    "Counterfeit Concern": "batch anti-counterfeit verification",
    "Functional Failure": "factory-tested long-life mechanism",
}

PAIN_EN = {
    "Leakage": "Leakage", "Cleaning Difficulty": "Hard to Clean", "Cup Holder Fit": "Cup Holder Fit",
    "Insulation Performance": "Weak Insulation", "Lid & Straw Mechanism": "Lid/Straw Issues",
    "Odor & Taste": "Bad Odor", "Durability": "Durability", "Size & Capacity": "Wrong Size",
    "Value & Price": "Value Concerns", "Shipping & Packaging": "Shipping Damage",
    "Not As Described": "Not As Described", "Condensation": "Sweating",
    "Skin Reaction": "Skin Irritation", "Drying & Clogging": "Clogging/Drying",
    "Shade Mismatch": "Shade Mismatch", "Counterfeit Concern": "Authenticity Doubts",
    "Functional Failure": "Stops Working",
}


class FAQItem(BaseModel):
    q: str
    a: str


class Listing(BaseModel):
    title: str
    bullets: list[str]
    faq: list[FAQItem]
    main_image_strategy: list[str]
    marketing_message: str
    source: str = "heuristic"


def _param_phrase(param) -> str:
    rec = param.recommended_state.split("（")[0].split("(")[0].strip()
    return rec


def generate_listing(product_title: str, pain_points: list[dict], params, position: str) -> Listing:
    top = pain_points[:5]

    # 标题：品牌词 + V2 + Top 痛点对应的英文卖点短语
    brand = product_title.split(" ")[0] if product_title else "Product"
    feats = [FIX_EN.get(x.pain_point, "upgraded core design") for x in params[:4]]
    feats_txt = ", ".join(list(dict.fromkeys(feats))[:3]) or "Upgraded V2 Design"
    title = f"{brand} V2 – {feats_txt} | Redesigned from Real Customer Reviews"

    # Bullets：每个 Top 痛点 -> 一条「已解决」英文卖点，附 Evidence 数量
    bullets = []
    for pp in top:
        n_ev = len(pp.get("evidence_review_ids", []))
        fix = FIX_EN.get(pp["name"], "a fully redesigned structure")
        pain_en = PAIN_EN.get(pp["name"], pp["name"])
        bullets.append(
            f"[SOLVED: {pain_en}] Upgraded to {fix} — based on {pp['review_count']} "
            f"real reviews ({n_ev} verifiable evidence quotes), avg {pp['avg_rating']} -> target 4.5+"
        )

    # FAQ：痛点即用户之问，参数改进即答
    faq = []
    q_map = {
        "Leakage": ("Will it leak in my bag?", "No. V2 adopts a dual seal + lock lid structure (engineering validation required before mass production), specifically engineered against the #1 complaint from V1 reviews."),
        "Cleaning Difficulty": ("Is the lid easy to clean?", "Yes. V2 lid fully disassembles — gasket and straw are removable and dishwasher-safe."),
        "Cup Holder Fit": ("Does it fit a standard car cup holder?", "V2 features a tapered base within standard cup-holder diameter range (see spec chart)."),
        "Insulation Performance": ("How long does it keep drinks cold?", "V2 strengthens the vacuum layer and adds a thermal-break lid; target cold retention 24h (engineering validation required)."),
    }
    for pp in top:
        if pp["name"] in q_map:
            q, a = q_map[pp["name"]]
        else:
            q = f"Customers reported '{PAIN_EN.get(pp['name'], pp['name'])}' on V1 — is it fixed?"
            a = f"Yes. V2 addresses it with {FIX_EN.get(pp['name'], 'a fully redesigned structure')} (engineering validation required)."
        faq.append(FAQItem(q=q, a=a))

    # 主图策略：痛点场景化拍摄
    img_bank = {
        "Leakage": "主图2：倒置摇晃测试 — 包内平放 24h 无渗漏（对比 V1 渗漏实录）",
        "Cleaning Difficulty": "主图3：杯盖 3 秒全拆解俯拍 + 洗碗机场景图",
        "Cup Holder Fit": "主图4：车载杯架插入实拍 + 底径标注尺寸图",
        "Insulation Performance": "主图5：24 小时温度曲线实验室图（冰块前后对比）",
        "Durability": "主图6：1.2m 跌落测试 + 涂层截面放大图",
        "Odor & Taste": "主图7：食品级材质认证卡片特写",
    }
    imgs = [img_bank.get(pp["name"], f"场景图：针对「{pp['display_name']}」的 Before/After 对比") for pp in top[:5]]
    imgs.insert(0, "主图1：白底产品主视觉（V2 双密封结构局部剖面光效）")

    msg = (f"Every V2 upgrade is backed by real customer reviews — "
           f"{sum(p['review_count'] for p in pain_points)} negative voices turned into {len(params)} engineering changes.")

    listing = Listing(title=title, bullets=bullets, faq=faq,
                      main_image_strategy=imgs, marketing_message=msg)

    # LLM 增强（可选）
    llm = get_llm()
    if llm.mode == "real":
        try:
            system = ("You are an Amazon listing copywriter. Improve the given title, bullets and FAQ. "
                      "Keep all numbers/evidence references unchanged. Output STRICT JSON: "
                      '{"title": str, "bullets": [str], "faq": [{"q": str, "a": str}]}')
            user = (f"Product: {product_title}\nPositioning: {position}\n"
                    f"Current: {listing.model_dump_json()}")
            out = llm.chat_json(system, user, max_tokens=1800)
            if out and out.get("title"):
                listing = Listing(
                    title=str(out["title"])[:200],
                    bullets=[str(b)[:400] for b in out.get("bullets", listing.bullets)][:7],
                    faq=[FAQItem(q=str(f["q"])[:200], a=str(f["a"])[:400])
                         for f in out.get("faq", [])][:6] or listing.faq,
                    main_image_strategy=imgs,
                    marketing_message=msg,
                    source="llm",
                )
        except Exception as e:
            log.warning("Listing LLM 增强失败：%s", e)
    return listing
