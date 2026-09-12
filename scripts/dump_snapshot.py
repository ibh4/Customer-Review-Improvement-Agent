# -*- coding: utf-8 -*-
"""Dump all backend API responses into a single static snapshot JSON
for the offline frontend fallback bundle."""
import json
import urllib.request

BASE = "http://127.0.0.1:8100"
OUT = r"i:\TRAE projects\AI+跨境黑客松巅峰赛\review2product\frontend\src\data\snapshot.json"

def get(path):
    with urllib.request.urlopen(BASE + path, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))

def post(path, payload):
    req = urllib.request.Request(
        BASE + path, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode("utf-8"))

snap = {"health": get("/health")}
products = get("/api/products")
snap["products"] = products
print("products:", len(products))

snap["analysis"] = {}
snap["timeseries"] = {}
snap["product_v2"] = {}
snap["listing"] = {}
snap["pains"] = {}
snap["reviews"] = {}          # {product_id: [review,...]}  (limit=50)
snap["evidence"] = {}         # {pain_id: [review,...]}

review_pool = {}              # dedupe by review_id

def pool_add(reviews):
    for rv in reviews:
        review_pool[rv["review_id"]] = rv

for i, p in enumerate(products, 1):
    pid = p["product_id"]
    snap["analysis"][pid] = get(f"/api/analysis/{pid}")
    snap["timeseries"][pid] = get(f"/api/products/{pid}/timeseries")
    snap["product_v2"][pid] = get(f"/api/product-v2/{pid}")
    snap["listing"][pid] = post("/api/generate-listing", {"product_id": pid})
    snap["reviews"][pid] = get(f"/api/products/{pid}/reviews?limit=50")
    pool_add(snap["reviews"][pid])
    pains = get(f"/api/pain-points/{pid}")
    snap["pains"][pid] = pains
    for pp in pains:
        pidn = pp["pain_point_id"]
        ev = get(f"/api/pain-points/{pidn}/evidence")
        snap["evidence"][pidn] = [r["review_id"] for r in ev]
        pool_add(ev)
    print(f"[{i}/{len(products)}] {pid} ok, pool={len(review_pool)}")

snap["review_pool"] = review_pool
# strip per-product review bodies (keep ids), resolve from pool at runtime
snap["reviews"] = {pid: [r["review_id"] for r in rs] for pid, rs in snap["reviews"].items()}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(snap, f, ensure_ascii=False, separators=(",", ":"))
import os
print("saved:", OUT, f"{os.path.getsize(OUT)/1e6:.2f} MB, pool={len(review_pool)}")
