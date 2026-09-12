"""Product V2 / 分析产物 Schema 校验测试。"""
from backend.app.schemas import AnalysisOut
from backend.services.analysis import analyze_product


def test_full_artifact_schema(clean_df, hero_pid):
    art = analyze_product(clean_df, hero_pid)
    # Pydantic 严格校验（字段类型/取值范围）
    rendered = _render(art)
    AnalysisOut(**{**rendered.model_dump(), "product_id": art["product_id"]})


def _render(art):
    from backend.app.main import _render_analysis
    return _render_analysis(art)


def test_product_v2_structure(clean_df, hero_pid):
    art = analyze_product(clean_df, hero_pid)
    v2 = art["product_v2"]
    assert len(v2["parameters"]) >= 3, "Product V2 应至少包含 3 条参数级改进"
    assert v2["positioning"]
    assert 3 <= len(v2["selling_points"]) <= 5
    for p in v2["parameters"]:
        assert p["parameter"] and p["current_state"] and p["recommended_state"]
        assert 0 <= p["confidence"] <= 1
        assert p["pain_point"] in {x["name"] for x in art["pain_points"]}
        assert isinstance(p["evidence_ids"], list)
    assert set(v2["before_after_profile"]) == {"metrics", "v1", "v2"}
    assert len(v2["before_after_profile"]["metrics"]) == len(v2["before_after_profile"]["v1"])


def test_no_fabricated_engineering_numbers(clean_df, hero_pid):
    """含具体数值的工程参数必须标注 engineering validation required。"""
    art = analyze_product(clean_df, hero_pid)
    for p in art["product_v2"]["parameters"]:
        rec = p["recommended_state"].lower()
        has_number = any(ch.isdigit() for ch in rec)
        if has_number:
            assert "validation required" in rec or "工程验证" in rec, \
                f"参数 {p['parameter']} 含数值但未标注需工程验证"


def test_listing_structure(clean_df, hero_pid):
    art = analyze_product(clean_df, hero_pid)
    listing = art["listing"]
    assert listing["title"] and len(listing["title"]) > 10
    assert len(listing["bullets"]) >= 3
    assert len(listing["faq"]) >= 3
    assert all(item["q"] and item["a"] for item in listing["faq"])
    assert len(listing["main_image_strategy"]) >= 3
    assert listing["source"] in {"heuristic", "llm"}


def test_root_cause_schema(clean_df, hero_pid):
    art = analyze_product(clean_df, hero_pid)
    assert len(art["root_causes"]) >= 3
    for name, rc in art["root_causes"].items():
        assert rc["root_cause"] and rc["affected_scenario"] and rc["affected_users"]
        assert 0 <= rc["severity"] <= 1
        assert rc["source"] in {"heuristic", "llm"}
        assert name in {x["name"] for x in art["pain_points"]}
