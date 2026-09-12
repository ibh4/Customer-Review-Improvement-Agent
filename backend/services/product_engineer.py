"""Product Engineer Agent：痛点 → 产品参数级改进建议（Product V2）。

规则映射来自痛点知识库；LLM 可用时润色 reason（结构化输出 + Pydantic 校验）。
置信度 = Evidence 数量与覆盖度的确定性函数（非 LLM 随机生成）：
  confidence = min(0.95, 0.45 + 0.30 * evidence_coverage + 0.20 * share_norm)
数值型工程参数一律标注 "engineering validation required"，绝不虚构。
"""
from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from backend.services import pain_catalog
from backend.services.llm import get_llm

log = logging.getLogger("r2p.engineer")


class ProductParam(BaseModel):
    parameter: str
    current_state: str
    recommended_state: str
    pain_point: str
    reason: str
    evidence_ids: list[str] = []
    confidence: float = Field(ge=0, le=1)
    source: str = "heuristic"


def _confidence(evidence_n: int, share: float) -> float:
    evidence_coverage = min(evidence_n / 12.0, 1.0)
    share_norm = min(share / 0.25, 1.0)
    return round(min(0.95, 0.45 + 0.30 * evidence_coverage + 0.20 * share_norm), 2)


def map_params(pain: dict, root_cause_summary: str) -> list[ProductParam]:
    cat = pain_catalog.CATALOG_BY_NAME.get(pain["name"])
    ev = pain.get("evidence_review_ids", [])
    conf = _confidence(len(ev), float(pain.get("share", 0)))

    if not cat or not cat.params:
        return [ProductParam(
            parameter=f"{pain['name'].lower().replace(' ', '_')}_review",
            current_state="当前设计未在痛点知识库中定位到对应参数",
            recommended_state="需人工评审该聚类代表评论后确定改进方向（engineering validation required）",
            pain_point=pain["name"],
            reason=f"该痛点占负面评论 {pain['share']*100:.1f}%，平均评分 {pain['avg_rating']}，"
                   f"已有 {len(ev)} 条 Evidence 支撑其优先级",
            evidence_ids=ev[:6],
            confidence=conf,
        )]

    out: list[ProductParam] = []
    for p in cat.params:
        out.append(ProductParam(
            parameter=p["parameter"],
            current_state=p["current_state"],
            recommended_state=p["recommended_state"],
            pain_point=pain["name"],
            reason=f"根因：{root_cause_summary}。该痛点 {pain['review_count']} 条负面评论 "
                   f"(占比 {pain['share']*100:.1f}%)，平均 {pain['avg_rating']} 星",
            evidence_ids=ev[:6],
            confidence=conf,
        ))
    return out


def refine_reasons_with_llm(params: list[ProductParam], pain: dict, sample_reviews: list[dict]) -> list[ProductParam]:
    """LLM 可用时：润色参数 reason（不改数值与置信度）。失败静默降级。"""
    llm = get_llm()
    if llm.mode != "real" or not params:
        return params
    try:
        sample_txt = "\n".join(f"- [{r['rating']}★] {r['review_text'][:180]}" for r in sample_reviews[:5])
        system = ("You are a senior product engineer. For each parameter improvement, write a concise "
                  "reason (<=45 words) grounded ONLY in the provided reviews. Output STRICT JSON: "
                  '{"reasons": [str, ...]} with exactly one reason per input parameter, same order.')
        user = (f"Pain: {pain['name']}\nParams: {[p.parameter for p in params]}\n"
                f"Current reasons: {[p.reason for p in params]}\nReviews:\n{sample_txt}")
        out = llm.chat_json(system, user)
        reasons = (out or {}).get("reasons") or []
        for i, p in enumerate(params):
            if i < len(reasons) and isinstance(reasons[i], str) and len(reasons[i]) > 10:
                params[i] = p.model_copy(update={"reason": reasons[i][:300], "source": "llm"})
    except Exception as e:
        log.warning("参数 reason LLM 润色失败：%s", e)
    return params
