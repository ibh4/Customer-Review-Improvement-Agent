"""Root Cause Agent：痛点 → 根因 / 场景 / 人群。

规则模板（heuristic，默认）+ LLM 结构化输出（可选增强）。
Pydantic 校验保证两种路径输出同构。
"""
from __future__ import annotations

import logging

from pydantic import BaseModel, Field

from backend.services import pain_catalog
from backend.services.llm import get_llm

log = logging.getLogger("r2p.root_cause")


class RootCause(BaseModel):
    pain_point: str
    root_cause: str
    affected_scenario: str
    affected_users: str
    severity: float = Field(ge=0, le=1)
    evidence_ids: list[str] = []
    source: str = "heuristic"  # heuristic | llm


_SYSTEM = """You are a product quality analyst for cross-border e-commerce.
Given a pain point cluster from customer reviews, output STRICT JSON:
{"pain_point": str, "root_cause": str (product design/manufacturing root cause, <=40 words),
 "affected_scenario": str, "affected_users": str}
Do NOT invent numeric engineering specs. Use the provided representative reviews as evidence."""


def analyze_root_cause(pain: dict, sample_reviews: list[dict]) -> RootCause:
    cat = pain_catalog.CATALOG_BY_NAME.get(pain["name"])
    heuristic = RootCause(
        pain_point=pain["name"],
        root_cause=(cat.root_cause if cat else f"质量一致性问题：集中于「{pain['display_name']}」相关主题，需结合评论定位具体设计/制造环节"),
        affected_scenario=(cat.scenario if cat else "日常使用"),
        affected_users=(cat.users if cat else "核心用户群"),
        severity=float(pain.get("severity", 0.5)),
        evidence_ids=pain.get("evidence_review_ids", [])[:5],
        source="heuristic",
    )

    llm = get_llm()
    if llm.mode != "real":
        return heuristic
    try:
        sample_txt = "\n".join(f"- [{r['rating']}★, {r['helpful_vote']} helpful] {r['review_text'][:220]}"
                               for r in sample_reviews[:6])
        user = (f"Pain point: {pain['name']} ({pain['display_name']}), "
                f"share={pain['share']}, avg_rating={pain['avg_rating']}\n"
                f"Representative negative reviews:\n{sample_txt}")
        out = llm.chat_json(_SYSTEM, user)
        if out:
            return RootCause(
                pain_point=pain["name"],
                root_cause=str(out.get("root_cause", heuristic.root_cause))[:300],
                affected_scenario=str(out.get("affected_scenario", heuristic.affected_scenario))[:120],
                affected_users=str(out.get("affected_users", heuristic.affected_users))[:120],
                severity=float(pain.get("severity", 0.5)),
                evidence_ids=heuristic.evidence_ids,
                source="llm",
            )
    except Exception as e:
        log.warning("RootCause LLM 增强失败，使用 heuristic：%s", e)
    return heuristic
