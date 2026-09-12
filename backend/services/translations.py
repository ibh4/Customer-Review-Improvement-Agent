"""翻译服务：商品名静态中文映射 + 评论动态翻译（LLM 优先，Google gtx 兜底）。

- 商品中文短名：静态映射（演示零依赖、零延迟）。
- 评论翻译：POST /api/translate 调用 translate_batch()；LLM(_real) 批量翻译，
  失败或 mock 模式走 translate.googleapis.com 免费 gtx 接口逐条翻译，
  再失败返回 None（前端降级显示英文原文，绝不伪造）。
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

log = logging.getLogger("r2p.translate")

# ---------------------------------------------------------------- ---- #
# 商品中文短名（ASIN -> 中文名）。显示格式：中文名 · English title
# ---------------------------------------------------------------- ---- #
PRODUCT_TITLES_ZH: dict[str, str] = {
    "B07C533XCW": "Segbeauty 化妆品分装喷雾瓶 160083",
    "B00R1TAN7I": "GranNaturals 猪鬃毛顺发梳（木柄大方梳）",
    "B019GBG0IE": "可折叠吹风机风罩（The Curly Co.）",
    "B08L5KN7X4": "Meeteasy 牙齿清洁工具套装",
    "B0107QYW14": "Harlorki 波西米亚水钻吊坠项圈项链",
    "B012Q9NGE4": "摩洛哥坚果油修护洗发水 237ml",
    "B07ZJKVVLW": "四叉防水眉笔（细头眉粉笔）",
    "B005BZQHEC": "Gauge Gear 耳洞扩张护理膏 10ml",
    "B074KD4PX2": "便携电动冲洗器（旅行 Bidet）",
    "B08B1PR9C7": "opove 延长甲胶套装（6 色 15ML）",
    "B004H5D40W": "Easy Feet 脚部清洁刷",
    "B06Y44MMT6": "Segbeauty 空瓶分装瓶 082",
    "B000FEF1V4": "飞利浦 Norelco T980 真空吸屑修须器",
    "B000GBMYC0": "博朗 8000 系列剃须刀网膜更换装",
    "B01DUYNJL4": "李施德林漱口水按压泵",
    "B005IYYF5E": "加大款波点浴帽（松紧带防水）",
    "B08RNQNFW1": "黑头吸出仪（USB 充电 LED 显示）",
    "B00DT4757A": "摇粒绒保暖耳罩发带（男女通用）",
    "B01BJCLNIA": "有机冷榨蓖麻油（护发睫毛生长）",
    "B07G19ZXWB": "EmaxDesign 17 件套化妆刷（玫瑰金）",
    "B00MZT4UEG": "Evolve 猪鬃毛便携旅行梳",
    "B000FEIOHW": "飞利浦 Sonicare 电池式电动牙刷",
    "B01IMEH6GG": "Sally Hansen Miracle Gel 6 件套",
    "B000X20Y4C": "Soft 'N Style 蝴蝶发夹（12 支混色）",
    "B01195J43I": "DASKY 29W 防静电陶瓷直发梳（粉色）",
}


def product_title_zh(product_id: str) -> Optional[str]:
    return PRODUCT_TITLES_ZH.get(product_id)


# ---------------------------------------------------------------- ---- #
# 动态文本翻译（评论等）：LLM 优先 -> gtx 兜底 -> None
# ---------------------------------------------------------------- ---- #
_CACHE: dict[tuple[str, str], str] = {}
_CACHE_MAX = 4000

_GTX_URL = "https://translate.googleapis.com/translate_a/single"


def _gtx_one(text: str, target: str) -> Optional[str]:
    """Google gtx 免费接口单条翻译。"""
    try:
        resp = httpx.get(
            _GTX_URL,
            params={"client": "gtx", "sl": "en", "tl": target, "dt": "t", "q": text},
            timeout=8.0,
        )
        resp.raise_for_status()
        data = resp.json()
        segs = data[0]
        return "".join(s[0] for s in segs if s and s[0]).strip() or None
    except Exception as e:
        log.warning("gtx translate failed: %s", e)
        return None


def _llm_batch(texts: list[str], target: str) -> Optional[list[str]]:
    """LLM 批量翻译（real 模式）；失败返回 None 走 gtx。"""
    from backend.services.llm import get_llm
    client = get_llm()
    if client.mode != "real":
        return None
    import json as _json
    payload = _json.dumps(texts, ensure_ascii=False)
    out = client.chat_json(
        system=f"You are a professional translator. Translate each English text into natural, concise {target} (Chinese Simplified if zh). "
               "Keep meaning, tone and product terms. Return JSON: {\"translations\": [\"...\", ...]} with EXACTLY the same length and order as input.",
        user=payload,
        max_tokens=4000,
    )
    if not out or not isinstance(out.get("translations"), list):
        return None
    trans = out["translations"]
    if len(trans) != len(texts):
        return None
    return [str(t) if t is not None else None for t in trans]


def translate_batch(texts: list[str], target: str = "zh-CN") -> list[Optional[str]]:
    """批量翻译，带内存缓存；不可翻译时对应位置返回 None（前端显示原文）。"""
    results: list[Optional[str]] = [None] * len(texts)
    pending: list[int] = []
    for i, text in enumerate(texts):
        if not text or not text.strip():
            results[i] = None
            continue
        key = (text, target)
        if key in _CACHE:
            results[i] = _CACHE[key]
        else:
            pending.append(i)

    if not pending:
        return results

    pending_texts = [texts[i] for i in pending]
    llm_out = _llm_batch(pending_texts, target)
    for j, i in enumerate(pending):
        translated = llm_out[j] if llm_out else _gtx_one(texts[i], target)
        if translated:
            results[i] = translated
            if len(_CACHE) >= _CACHE_MAX:
                _CACHE.clear()
            _CACHE[(texts[i], target)] = translated
    return results
