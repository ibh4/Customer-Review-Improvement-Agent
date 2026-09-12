"""PainScore：可解释痛点优先级评分（0-100）。

PainScore = Frequency × Severity × Helpfulness × Recency
  - Frequency   该痛点评论占全部负面评论比例
  - Severity    由痛点内平均评分折算（(5 - avg_rating) / 4，1-3星 → 0.5~1.0）
  - Helpfulness 痛点内平均 helpful_vote 跨痛点 min-max 归一化
  - Recency     痛点内平均时间戳跨痛点 min-max 归一化（0~1）
最终跨痛点归一化到 0-100（最大痛点 = 100）。

全部为确定性计算，禁止 LLM 生成 PainScore。
"""
from __future__ import annotations

import math


def severity(avg_rating: float) -> float:
    """1-3 星 → 0.5~1.0（评分越低越严重）。"""
    avg_rating = min(max(avg_rating, 1.0), 5.0)
    return (5.0 - avg_rating) / 4.0


def _minmax(values: list[float], lo: float = 0.0, hi: float = 1.0) -> list[float]:
    """min-max 归一化并压入 [lo, hi]，避免除零。"""
    if not values:
        return []
    mn, mx = min(values), max(values)
    if math.isclose(mn, mx):
        return [hi] * len(values)
    span = mx - mn
    return [lo + (hi - lo) * (v - mn) / span for v in values]


def compute_pain_scores(clusters: list[dict]) -> list[dict]:
    """为每个痛点簇补充评分组件与 pain_score（0-100，最大=100）。

    输入 cluster dict 需含: review_count, total_negative, avg_rating,
    avg_helpful, avg_timestamp
    """
    if not clusters:
        return []
    freqs = [c["review_count"] / max(c["total_negative"], 1) for c in clusters]
    sevs = [severity(c["avg_rating"]) for c in clusters]
    helps = _minmax([float(c.get("avg_helpful") or 0.0) for c in clusters], lo=0.3, hi=1.0)
    recents = _minmax([float(c.get("avg_timestamp") or 0.0) for c in clusters], lo=0.5, hi=1.0)

    raws = []
    for f, s, h, r in zip(freqs, sevs, helps, recents):
        raws.append(f * s * h * r)
    mx = max(raws) if raws else 0.0

    out = []
    for c, f, s, h, r, raw in zip(clusters, freqs, sevs, helps, recents, raws):
        score = round(100.0 * raw / mx, 1) if mx > 0 else 0.0
        cc = dict(c)
        cc.update({
            "frequency": round(f, 4),
            "severity": round(s, 4),
            "helpfulness": round(h, 4),
            "recency": round(r, 4),
            "pain_score": score,
            "score_components": {
                "frequency": round(f, 3), "severity": round(s, 3),
                "helpfulness": round(h, 3), "recency": round(r, 3),
            },
        })
        out.append(cc)
    out.sort(key=lambda x: x["pain_score"], reverse=True)
    return out
