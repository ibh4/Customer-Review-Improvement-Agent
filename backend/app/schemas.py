"""API 与产物的 Pydantic Schema（测试 test_product_v2_schema 同样使用）。"""
from __future__ import annotations

from pydantic import BaseModel, Field


class ReviewOut(BaseModel):
    review_id: str
    product_id: str
    rating: float
    review_title: str = ""
    review_text: str
    helpful_vote: int = 0
    timestamp: int = 0
    data_source: str = "unknown"
    matched_pain: str | None = None


class ProductSummary(BaseModel):
    product_id: str
    product_title: str
    product_title_zh: str | None = None
    category: str
    price: float | None = None
    review_count: int
    negative_count: int
    avg_rating: float
    is_demo_hero: bool = False
    analyzed: bool = False
    data_source: str = "unknown"


class PainPointOut(BaseModel):
    pain_point_id: str
    cluster_id: int
    name: str
    display_name: str
    review_count: int
    share: float = Field(ge=0, le=1)
    avg_rating: float
    severity: float = Field(ge=0, le=1)
    frequency: float
    helpfulness: float
    recency: float
    pain_score: float = Field(ge=0, le=100)
    score_components: dict
    keywords: list[str] = []
    evidence_review_ids: list[str] = []
    evidence_status: str = "ok"


class RootCauseOut(BaseModel):
    pain_point: str
    root_cause: str
    affected_scenario: str
    affected_users: str
    severity: float
    evidence_ids: list[str] = []
    source: str


class ProductParamOut(BaseModel):
    parameter: str
    current_state: str
    recommended_state: str
    pain_point: str
    reason: str
    evidence_ids: list[str] = []
    confidence: float = Field(ge=0, le=1)
    source: str


class ProductV2Out(BaseModel):
    positioning: str
    parameters: list[ProductParamOut]
    selling_points: list[str]
    before_after_profile: dict


class FAQItem(BaseModel):
    q: str
    a: str


class ListingOut(BaseModel):
    title: str
    bullets: list[str]
    faq: list[FAQItem]
    main_image_strategy: list[str]
    marketing_message: str
    source: str


class AnalysisOut(BaseModel):
    product_id: str
    product_title: str
    product_title_zh: str | None = None
    category: str
    data_source: str
    generated_at: str
    llm_mode: str
    stats: dict
    pain_points: list[PainPointOut]
    root_causes: dict[str, RootCauseOut]
    product_v2: ProductV2Out
    listing: ListingOut


class HealthOut(BaseModel):
    status: str
    llm_mode: str
    data_source: str
    products: int
    reviews: int
    analysis_ready: bool
    version: str = "1.0.0"


class AgentReviewRequest(BaseModel):
    review_text: str = Field(min_length=3, max_length=12000)
    product_id: str | None = None


class AgentReviewAnalysis(BaseModel):
    summary: str
    sentiment: str
    rating_estimate: int = Field(ge=1, le=5)
    pain_points: list[str] = []
    root_cause: str
    affected_scenario: str
    recommended_action: str
    evidence_phrases: list[str] = []
    confidence: float = Field(ge=0, le=1)
    mode: str = "heuristic"
