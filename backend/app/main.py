"""Review2Product FastAPI 入口。

端点一览（OpenAPI 文档: /docs）：
  GET  /health
  GET  /api/products
  GET  /api/products/{id}
  GET  /api/products/{id}/reviews
  POST /api/analyze                     body: {"product_id": "..."}
  GET  /api/analysis/{product_id}       （缺失时自动触发分析）
  GET  /api/pain-points/{product_id}
  GET  /api/pain-points/{pain_id}/evidence   pain_id = "<product_id>::<cluster_id>"
  GET  /api/product-v2/{product_id}
  POST /api/generate-listing            body: {"product_id": "..."}
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app import store
from backend.app.schemas import (AnalysisOut, HealthOut, ListingOut, PainPointOut,
                                 ProductSummary, ProductV2Out, ReviewOut, RootCauseOut,
                                 ProductParamOut, FAQItem, AgentReviewRequest, AgentReviewAnalysis)
from backend.services import analysis as analysis_svc
from backend.services import translations
from backend.services.llm import llm_mode

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("r2p.api")


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        store.run_pipeline_if_needed()
    except Exception as e:
        log.error("startup pipeline failed（API 仍将尝试懒加载）：%s", e)
    yield


app = FastAPI(
    title="Review2Product API",
    description="Global Voice of Customer → Product Evolution Agent",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In the Docker/ModelScope image FastAPI serves the compiled React SPA from the
# same port as the API. API routes above remain unchanged; this catch-all only
# handles browser navigation and static files after those routes are resolved.
_FRONTEND_DIST = __import__('pathlib').Path(__file__).resolve().parents[2] / 'frontend' / 'dist'


class AnalyzeRequest(BaseModel):
    product_id: str | None = None  # 缺省取 demo hero 商品


class TranslateRequest(BaseModel):
    texts: list[str]
    target: str = "zh-CN"


def _heuristic_review_analysis(text: str, product_context: str = "") -> dict:
    low = text.lower()
    rules = [
        (['leak', 'spill', 'drip', 'seal'], 'Leakage', 'sealing structure', 'travel / carrying', 'Improve lid sealing and validate under bag movement.'),
        (['clean', 'wash', 'hard to reach', 'dishwasher'], 'Cleaning difficulty', 'narrow or non-detachable parts', 'daily cleaning', 'Use detachable, wider-mouth components and validate cleaning workflow.'),
        (['break', 'broke', 'crack', 'stopped', 'not work', 'dead'], 'Functional failure', 'mechanism or durability reliability', 'daily use', 'Run reliability testing and reinforce the failure-prone mechanism.'),
        (['battery', 'charge', 'drain'], 'Battery performance', 'capacity / charging strategy', 'portable use', 'Validate battery endurance and charging behavior against real usage.'),
        (['fit', 'cup holder', 'too big', 'too small'], 'Fit and ergonomics', 'product geometry', 'commuting / vehicle use', 'Review dimensions against common usage environments.'),
    ]
    found = next((r for r in rules if any(k in low for k in r[0])), None)
    if found:
        _, pain, cause, scenario, action = found
        phrases = [s.strip() for s in text.replace('!', '.').replace('?', '.').split('.') if s.strip()][:2]
        return {'summary': text.strip()[:220], 'sentiment': 'negative', 'rating_estimate': 2,
                'pain_points': [{'Leakage':'漏液/渗漏','Cleaning difficulty':'清洁困难','Functional failure':'功能故障','Battery performance':'电池续航','Fit and ergonomics':'尺寸与人体工学'}[pain]],
                'root_cause': {'sealing structure':'密封结构','narrow or non-detachable parts':'部件狭窄或不可拆卸','mechanism or durability reliability':'机构或耐久性可靠性','capacity / charging strategy':'电池容量与充电策略','product geometry':'产品尺寸设计'}[cause],
                'affected_scenario': {'travel / carrying':'出行携带','daily cleaning':'日常清洁','daily use':'日常使用','portable use':'移动使用','commuting / vehicle use':'通勤/车载使用'}[scenario],
                'recommended_action': {'Improve lid sealing and validate under bag movement.':'改进盖体密封，并验证随身携带时的防漏表现。','Use detachable, wider-mouth components and validate cleaning workflow.':'采用可拆卸的大口径部件，并验证清洁流程。','Run reliability testing and reinforce the failure-prone mechanism.':'开展可靠性测试并加强易失效机构。','Validate battery endurance and charging behavior against real usage.':'结合真实使用场景验证续航与充电表现。','Review dimensions against common usage environments.':'对照常见使用环境复核产品尺寸。'}[action], 'evidence_phrases': phrases, 'confidence': 0.78, 'mode': 'heuristic'}
    return {'summary': text.strip()[:220], 'sentiment': 'neutral', 'rating_estimate': 3,
            'pain_points': ['一般使用体验'], 'root_cause': '需要更多证据才能确认根因',
            'affected_scenario': '未明确', 'recommended_action': '在做出工程决策前收集更多评论证据。',
            'evidence_phrases': [text.strip()[:160]], 'confidence': 0.42, 'mode': 'heuristic'}


def _analysis_or_404(product_id: str) -> dict:
    art = store.load_analysis(product_id)
    if art is None:
        df = store.load_clean_df()
        if product_id not in set(df["product_id"]):
            raise HTTPException(404, f"product {product_id} not found")
        log.info("商品 %s 无分析产物，自动触发分析", product_id)
        art = analysis_svc.analyze_product(df, product_id)
        analysis_svc.save_artifact(art)
        store.save_hero(product_id)
    return art


def _to_pain_out(art: dict) -> list[PainPointOut]:
    out = []
    for p in art["pain_points"]:
        d = dict(p)
        d["pain_point_id"] = f"{art['product_id']}::{p['cluster_id']}"
        d.setdefault("frequency", 0.0)
        d.setdefault("helpfulness", 0.0)
        d.setdefault("recency", 0.0)
        d.setdefault("score_components", {})
        out.append(PainPointOut(**d))
    return out


@app.get("/health", response_model=HealthOut)
def health():
    try:
        products = store.list_products()
        reviews = int(sum(p["review_count"] for p in products))
        ready = any(p["analyzed"] for p in products)
        src = products[0]["data_source"] if products else "none"
        return HealthOut(status="ok", llm_mode=llm_mode(), data_source=src,
                         products=len(products), reviews=reviews, analysis_ready=ready)
    except Exception as e:
        log.exception("health check failed")
        raise HTTPException(500, f"unhealthy: {e}")


@app.get("/api/products", response_model=list[ProductSummary])
def products():
    return [ProductSummary(**{**p, "product_title_zh": translations.product_title_zh(p["product_id"])})
            for p in store.list_products()]


@app.get("/api/products/{product_id}", response_model=ProductSummary)
def product_detail(product_id: str):
    for p in store.list_products():
        if p["product_id"] == product_id:
            return ProductSummary(**{**p, "product_title_zh": translations.product_title_zh(product_id)})
    raise HTTPException(404, "product not found")


@app.post("/api/translate")
def translate(req: TranslateRequest):
    """英文评论/文本动态翻译（LLM 优先，gtx 兜底，失败位置返回 null）。"""
    texts = [t[:2000] for t in req.texts[:30]]  # 单条限长、批量限 30
    out = translations.translate_batch(texts, req.target)
    return {"translations": out}


@app.post("/api/agent/analyze-review", response_model=AgentReviewAnalysis)
def agent_analyze_review(req: AgentReviewRequest):
    """Analyze pasted review text with configured OpenAI-compatible endpoint or heuristic fallback."""
    context = req.product_id or ""
    client = __import__('backend.services.llm', fromlist=['get_llm']).get_llm()
    result = client.analyze_review(req.review_text, context)
    if not result:
        result = _heuristic_review_analysis(req.review_text, context)
    result.setdefault('mode', 'real' if client.mode == 'real' else 'heuristic')
    return AgentReviewAnalysis(**result)


@app.get("/api/products/{product_id}/timeseries")
def product_timeseries(product_id: str) -> list[dict]:
    """月度评论量/评分/负面数聚合（Review Dynamics 图数据源）。"""
    if product_id not in {p["product_id"] for p in store.list_products()}:
        raise HTTPException(404, "product not found")
    return store.get_timeseries(product_id)


@app.get("/api/products/{product_id}/reviews", response_model=list[ReviewOut])
def product_reviews(product_id: str, limit: int = Query(50, ge=1, le=500),
                    min_rating: float | None = Query(None, ge=1, le=5),
                    max_rating: float | None = Query(None, ge=1, le=5)):
    rows = store.get_reviews(product_id, limit=limit, min_rating=min_rating, max_rating=max_rating)
    if not rows and product_id not in {p["product_id"] for p in store.list_products()}:
        raise HTTPException(404, "product not found")
    return [ReviewOut(**r) for r in rows]


@app.post("/api/analyze", response_model=AnalysisOut)
def analyze(req: AnalyzeRequest):
    pid = req.product_id or (store._hero_product_id() or "")
    if not pid:
        prods = store.list_products()
        if not prods:
            raise HTTPException(503, "no data, run pipeline first")
        pid = prods[0]["product_id"]
    df = store.load_clean_df()
    if pid not in set(df["product_id"]):
        raise HTTPException(404, f"product {pid} not found")
    art = analysis_svc.analyze_product(df, pid)
    analysis_svc.save_artifact(art)
    store.save_hero(pid)
    return _render_analysis(art)


@app.get("/api/analysis/{product_id}", response_model=AnalysisOut)
def get_analysis(product_id: str):
    return _render_analysis(_analysis_or_404(product_id))


@app.get("/api/pain-points/{product_id}", response_model=list[PainPointOut])
def pain_points(product_id: str):
    return _to_pain_out(_analysis_or_404(product_id))


@app.get("/api/pain-points/{pain_id}/evidence", response_model=list[ReviewOut])
def pain_evidence(pain_id: str, limit: int = Query(50, ge=1, le=100)):
    if "::" not in pain_id:
        raise HTTPException(400, "pain_id format should be '<product_id>::<cluster_id>'")
    pid, cluster_id = pain_id.rsplit("::", 1)
    art = _analysis_or_404(pid)
    target = next((p for p in art["pain_points"] if str(p["cluster_id"]) == cluster_id), None)
    if target is None:
        raise HTTPException(404, f"pain point {pain_id} not found")
    ids = target.get("evidence_review_ids", [])[:limit]
    if not ids:
        return []
    rows = store.get_reviews(pid, limit=limit, review_ids=ids)
    order = {rid: i for i, rid in enumerate(ids)}
    rows.sort(key=lambda r: order.get(r["review_id"], 999))
    for r in rows:
        r["matched_pain"] = target["name"]
    return [ReviewOut(**r) for r in rows]


@app.get("/api/product-v2/{product_id}", response_model=ProductV2Out)
def product_v2(product_id: str):
    return ProductV2Out(**_analysis_or_404(product_id)["product_v2"])


@app.post("/api/generate-listing", response_model=ListingOut)
def generate_listing(req: AnalyzeRequest):
    art = _analysis_or_404(req.product_id) if req.product_id else _analysis_or_404(
        store._hero_product_id() or store.list_products()[0]["product_id"])
    return ListingOut(**art["listing"])


def _render_analysis(art: dict) -> AnalysisOut:
    return AnalysisOut(
        product_id=art["product_id"], product_title=art["product_title"],
        product_title_zh=translations.product_title_zh(art["product_id"]),
        category=art["category"], data_source=art["data_source"],
        generated_at=art["generated_at"], llm_mode=art.get("llm_mode", "mock"),
        stats=art["stats"], pain_points=_to_pain_out(art),
        root_causes={k: RootCauseOut(**v) for k, v in art["root_causes"].items()},
        product_v2=ProductV2Out(
            positioning=art["product_v2"]["positioning"],
            parameters=[ProductParamOut(**p) for p in art["product_v2"]["parameters"]],
            selling_points=art["product_v2"]["selling_points"],
            before_after_profile=art["product_v2"]["before_after_profile"],
        ),
        listing=ListingOut(**{**art["listing"], "faq": [FAQItem(**f) for f in art["listing"]["faq"]]}),
    )


@app.get('/{spa_path:path}', include_in_schema=False)
def serve_frontend(spa_path: str = ''):
    """Serve Vite output for ModelScope single-port deployment."""
    if not _FRONTEND_DIST.exists():
        raise HTTPException(404, 'frontend build not found')
    requested = (_FRONTEND_DIST / spa_path).resolve()
    if requested.is_file() and _FRONTEND_DIST in requested.parents:
        return FileResponse(requested)
    index = _FRONTEND_DIST / 'index.html'
    if index.exists():
        return FileResponse(index)
    raise HTTPException(404, 'frontend index not found')
