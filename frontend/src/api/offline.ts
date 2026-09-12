/**
 * Offline fallback — static API snapshot.
 *
 * The packaged single-file build must work when opened via file:// with no
 * backend running. `request()` in client.ts first tries the real fetch and,
 * on any failure, resolves here against snapshot.json dumped from the live
 * FastAPI instance (scripts/dump_snapshot.py).
 */
import snapshotJson from '../data/snapshot.json'
import type {
  Analysis,
  HealthStatus,
  Listing,
  PainPoint,
  ProductSummary,
  ProductV2,
  Review,
  TimeseriesPoint,
} from '../types'

interface Snapshot {
  health: HealthStatus
  products: ProductSummary[]
  analysis: Record<string, Analysis>
  timeseries: Record<string, TimeseriesPoint[]>
  product_v2: Record<string, ProductV2>
  listing: Record<string, Listing>
  pains: Record<string, PainPoint[]>
  /** product_id -> review_id[] (bodies live in review_pool) */
  reviews: Record<string, string[]>
  /** pain_point_id -> review_id[] */
  evidence: Record<string, string[]>
  review_pool: Record<string, Review>
}

const snap = snapshotJson as unknown as Snapshot

const poolReview = (id: string): Review | undefined => snap.review_pool[id]

/** serve /api/products/{id}/reviews with the same query semantics as backend */
function offlineReviews(productId: string, search: string): Review[] {
  const qs = new URLSearchParams(search)
  const limit = qs.has('limit') ? Number(qs.get('limit')) : 50
  const minRating = qs.has('min_rating') ? Number(qs.get('min_rating')) : null
  const maxRating = qs.has('max_rating') ? Number(qs.get('max_rating')) : null
  let list = (snap.reviews[productId] ?? []).map(poolReview).filter((r): r is Review => Boolean(r))
  if (minRating !== null) list = list.filter((r) => r.rating >= minRating)
  if (maxRating !== null) list = list.filter((r) => r.rating <= maxRating)
  return list.slice(0, Number.isFinite(limit) && limit > 0 ? limit : 50)
}

/**
 * Resolve an API route from the snapshot.
 * Returns `undefined` when the route/path is not covered.
 */
export function resolveOffline(path: string, init?: RequestInit): unknown {
  const url = new URL(path, 'http://offline.local')
  const p = decodeURIComponent(url.pathname)
  const method = (init?.method ?? 'GET').toUpperCase()
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined

  if (method === 'POST' && p === '/api/translate') {
    /* no translation backend offline — callers keep original text */
    const texts = ((body?.texts as string[]) ?? []).map(() => null)
    return { translations: texts }
  }

  if (p === '/health') return snap.health
  if (p === '/api/products') return snap.products

  let m = /^\/api\/products\/([^/]+)\/timeseries$/.exec(p)
  if (m) return snap.timeseries[m[1]] ?? []

  m = /^\/api\/products\/([^/]+)\/reviews$/.exec(p)
  if (m) return offlineReviews(m[1], url.search)

  m = /^\/api\/products\/([^/]+)$/.exec(p)
  if (m) {
    const id = m[1]
    return snap.products.find((x) => x.product_id === id) ?? null
  }

  m = /^\/api\/analysis\/([^/]+)$/.exec(p)
  if (m) return snap.analysis[m[1]] ?? null

  m = /^\/api\/product-v2\/([^/]+)$/.exec(p)
  if (m) return snap.product_v2[m[1]] ?? null

  /* pain ids contain '::' — match evidence route before the plain one */
  m = /^\/api\/pain-points\/(.+)\/evidence$/.exec(p)
  if (m) {
    return (snap.evidence[m[1]] ?? []).map(poolReview).filter((r): r is Review => Boolean(r))
  }
  m = /^\/api\/pain-points\/([^/]+)$/.exec(p)
  if (m) return snap.pains[m[1]] ?? []

  if (method === 'POST' && p === '/api/analyze') {
    const id = String(body?.product_id ?? '')
    return snap.analysis[id] ?? null
  }
  if (method === 'POST' && p === '/api/generate-listing') {
    const id = String(body?.product_id ?? '')
    return snap.listing[id] ?? null
  }

  return undefined
}
