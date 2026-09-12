import type {
  Analysis,
  HealthStatus,
  Listing,
  ProductSummary,
  ProductV2,
  Review,
  TimeseriesPoint,
} from '../types'
import { resolveOffline } from './offline'

export interface AgentReviewAnalysis {
  summary: string
  sentiment: string
  rating_estimate: number
  pain_points: string[]
  root_cause: string
  affected_scenario: string
  recommended_action: string
  evidence_phrases: string[]
  confidence: number
  mode: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(path, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })
    if (!res.ok) {
      let detail = `${res.status} ${res.statusText}`
      try {
        const body = (await res.json()) as { detail?: unknown }
        if (body?.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)
      } catch {
        /* keep status text */
      }
      throw new Error(`API ${path} failed: ${detail}`)
    }
    return (await res.json()) as T
  } catch (err) {
    /* no backend (file:// or offline) — fall back to the embedded snapshot */
    const offline = resolveOffline(path, init)
    if (offline !== undefined) return offline as T
    throw err
  }
}

export interface ReviewsQuery {
  limit?: number
  min_rating?: number
  max_rating?: number
}

export const api = {
  health: () => request<HealthStatus>('/health'),
  products: () => request<ProductSummary[]>('/api/products'),
  timeseries: (productId: string) =>
    request<TimeseriesPoint[]>(`/api/products/${encodeURIComponent(productId)}/timeseries`),
  analysis: (productId: string) => request<Analysis>(`/api/analysis/${encodeURIComponent(productId)}`),
  /** painPointId contains "::" and must be fully encoded */
  evidence: (painPointId: string) =>
    request<Review[]>(`/api/pain-points/${encodeURIComponent(painPointId)}/evidence`),
  reviews: (productId: string, query: ReviewsQuery = {}) => {
    const qs = new URLSearchParams()
    if (query.limit !== undefined) qs.set('limit', String(query.limit))
    if (query.min_rating !== undefined) qs.set('min_rating', String(query.min_rating))
    if (query.max_rating !== undefined) qs.set('max_rating', String(query.max_rating))
    const suffix = qs.size > 0 ? `?${qs.toString()}` : ''
    return request<Review[]>(`/api/products/${encodeURIComponent(productId)}/reviews${suffix}`)
  },
  analyze: (productId: string) =>
    request<Analysis>('/api/analyze', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    }),
  productV2: (productId: string) =>
    request<ProductV2>(`/api/product-v2/${encodeURIComponent(productId)}`),
  generateListing: (productId: string) =>
    request<Listing>('/api/generate-listing', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    }),
  /** dynamic translation (en → zh) for reviews; null entry = keep original */
  translate: (texts: string[], target = 'zh-CN') =>
    request<{ translations: (string | null)[] }>('/api/translate', {
      method: 'POST',
      body: JSON.stringify({ texts, target }),
    }),
  analyzeReview: (reviewText: string, productId?: string) =>
    request<AgentReviewAnalysis>('/api/agent/analyze-review', {
      method: 'POST',
      body: JSON.stringify({ review_text: reviewText, product_id: productId }),
    }),
}

/** module-level translation cache shared by every ReviewCard instance */
const translationCache = new Map<string, string>()
const translationPending = new Map<string, Promise<string | null>>()

/**
 * Translate a single text (with cache + in-flight dedup).
 * Resolves to null when translation is unavailable — caller keeps original.
 */
export function translateText(text: string, target = 'zh-CN'): Promise<string | null> {
  if (!text?.trim()) return Promise.resolve(null)
  const cached = translationCache.get(text)
  if (cached !== undefined) return Promise.resolve(cached)
  const inflight = translationPending.get(text)
  if (inflight) return inflight
  const p = api
    .translate([text], target)
    .then(({ translations }) => {
      const out = translations?.[0] ?? null
      translationPending.delete(text)
      if (out) translationCache.set(text, out)
      return out
    })
    .catch(() => {
      translationPending.delete(text)
      return null
    })
  translationPending.set(text, p)
  return p
}
