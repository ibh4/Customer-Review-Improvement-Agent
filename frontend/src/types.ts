export interface ProductSummary {
  product_id: string
  product_title: string
  product_title_zh?: string | null
  category: string
  price: number | null
  review_count: number
  negative_count: number
  avg_rating: number
  is_demo_hero: boolean
  analyzed: boolean
  data_source: string
}

export interface ScoreComponents {
  frequency: number
  severity: number
  helpfulness: number
  recency: number
}

export interface PainPoint {
  /** format: "{productId}::{clusterId}" */
  pain_point_id: string
  cluster_id: number
  name: string
  display_name: string
  review_count: number
  /** 0-1 */
  share: number
  avg_rating: number
  /** 0-1 */
  severity: number
  frequency: number
  helpfulness: number
  recency: number
  /** 0-100 */
  pain_score: number
  score_components: ScoreComponents
  keywords: string[]
  evidence_review_ids: string[]
  evidence_status: string
}

export interface AnalysisStats {
  total_reviews: number
  negative_reviews: number
  avg_rating: number
  rating_distribution: Record<string, number>
  /** [minTs, maxTs] unix seconds */
  date_range: [number, number]
  cluster_method: string
  n_clusters_raw: number
}

export interface RootCause {
  pain_point: string
  root_cause: string
  affected_scenario: string
  affected_users: string
  severity: number
  evidence_ids: string[]
  source: string
}

export interface ParameterUpgrade {
  parameter: string
  current_state: string
  recommended_state: string
  /** english pain point name */
  pain_point: string
  reason: string
  evidence_ids: string[]
  confidence: number
  source: string
}

export interface BeforeAfterProfile {
  metrics: string[]
  v1: number[]
  v2: number[]
}

export interface ProductV2 {
  positioning: string
  parameters: ParameterUpgrade[]
  selling_points: string[]
  before_after_profile: BeforeAfterProfile
}

export interface FaqItem {
  q: string
  a: string
}

export interface Listing {
  title: string
  bullets: string[]
  faq: FaqItem[]
  main_image_strategy: string[]
  marketing_message: string
  source: string
}

export interface Analysis {
  product_id: string
  product_title: string
  product_title_zh?: string | null
  category: string
  data_source: string
  generated_at: string
  llm_mode: 'mock' | 'real'
  stats: AnalysisStats
  pain_points: PainPoint[]
  root_causes: Record<string, RootCause>
  product_v2: ProductV2
  listing: Listing
}

export interface Review {
  review_id: string
  product_id: string
  rating: number
  review_title: string
  review_text: string
  helpful_vote: number
  /** unix seconds */
  timestamp: number
  data_source: string
  matched_pain?: string
}

export interface HealthStatus {
  status: string
  llm_mode: 'mock' | 'real'
  data_source: string
  products: number
  reviews: number
  analysis_ready: boolean
  version: string
}

/** monthly aggregation from /api/products/{id}/timeseries */
export interface TimeseriesPoint {
  /** 'YYYY-MM' */
  month: string
  count: number
  avg_rating: number
  negative: number
}
