"""API 集成测试：health / products / analyze / pain-points / evidence / product-v2 / listing。"""
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    # startup 事件会在产物缺失时自动执行 pipeline（正常情况下直接命中缓存）
    with TestClient(app) as c:
        yield c


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"
    assert d["products"] >= 1
    assert d["reviews"] >= 300
    assert d["llm_mode"] in {"mock", "real"}


def test_products_list(client):
    r = client.get("/api/products")
    assert r.status_code == 200
    prods = r.json()
    assert len(prods) >= 1
    assert any(p["is_demo_hero"] for p in prods), "必须有默认 Demo 商品"


def _hero(client) -> str:
    return next(p["product_id"] for p in client.get("/api/products").json() if p["is_demo_hero"])


def test_analyze_and_downstream(client):
    pid = _hero(client)
    r = client.post("/api/analyze", json={"product_id": pid})
    assert r.status_code == 200
    art = r.json()
    assert len(art["pain_points"]) >= 3
    top = art["pain_points"][0]
    assert top["pain_score"] == max(p["pain_score"] for p in art["pain_points"])

    # pain-points
    r2 = client.get(f"/api/pain-points/{pid}")
    assert r2.status_code == 200 and len(r2.json()) >= 3

    # evidence 可回溯
    pain_id = top["pain_point_id"]
    r3 = client.get(f"/api/pain-points/{pain_id}/evidence")
    assert r3.status_code == 200
    evs = r3.json()
    assert len(evs) >= 3
    for ev in evs:
        assert ev["review_text"] and ev["product_id"] == pid
        assert ev["matched_pain"] == top["name"]

    # product-v2
    r4 = client.get(f"/api/product-v2/{pid}")
    assert r4.status_code == 200
    assert len(r4.json()["parameters"]) >= 3

    # listing
    r5 = client.post("/api/generate-listing", json={"product_id": pid})
    assert r5.status_code == 200
    assert len(r5.json()["bullets"]) >= 3

    # reviews
    r6 = client.get(f"/api/products/{pid}/reviews?limit=10&max_rating=3")
    assert r6.status_code == 200
    assert all(x["rating"] <= 3 for x in r6.json())

    # analysis 读取
    r7 = client.get(f"/api/analysis/{pid}")
    assert r7.status_code == 200


def test_404_and_400(client):
    assert client.get("/api/products/NOPE").status_code == 404
    assert client.get("/api/pain-points/bad-format/evidence").status_code == 400
