"""PainScore 测试：可解释性 / 归一化 / 排序。"""
from backend.services.pain_score import compute_pain_scores, severity


def _cluster(n, total, rating, helpful=10, ts=1_700_000_000):
    return {"name": f"p{n}", "review_count": n, "total_negative": total,
            "avg_rating": rating, "avg_helpful": helpful, "avg_timestamp": ts}


def test_severity_bounds():
    assert severity(1.0) == 1.0
    assert severity(3.0) == 0.5
    assert severity(5.0) == 0.0
    assert 0 <= severity(2.3) <= 1


def test_score_normalized_0_100():
    clusters = [_cluster(300, 1000, 1.5, 40, 1_740_000_000),
                _cluster(200, 1000, 2.0, 20, 1_700_000_000),
                _cluster(100, 1000, 2.8, 5, 1_710_000_000)]
    out = compute_pain_scores(clusters)
    scores = [c["pain_score"] for c in out]
    assert all(0 <= s <= 100 for s in scores)
    assert max(scores) == 100.0, "最大痛点应归一化为 100"
    assert out == sorted(out, key=lambda c: -c["pain_score"]), "结果应按分数降序"


def test_higher_frequency_severity_scores_higher():
    weak = _cluster(50, 1000, 3.0, 1, 1_700_000_000)
    strong = _cluster(500, 1000, 1.2, 30, 1_740_000_000)
    out = compute_pain_scores([weak, strong])
    by_name = {c["name"]: c for c in out}
    assert by_name["p500"]["pain_score"] == 100.0
    assert by_name["p50"]["pain_score"] < 30


def test_components_explainable():
    out = compute_pain_scores([_cluster(100, 200, 2.0)])
    c = out[0]
    assert set(c["score_components"]) == {"frequency", "severity", "helpfulness", "recency"}
    assert abs(c["frequency"] - 0.5) < 1e-6


def test_empty_and_single():
    assert compute_pain_scores([]) == []
    out = compute_pain_scores([_cluster(10, 10, 1.0)])
    assert out[0]["pain_score"] == 100.0
