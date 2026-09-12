import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import type { PainPoint, Review } from '../types'
import { useI18n, painLabel } from '../i18n'
import { ReviewCard } from './ReviewCard'
import { ErrorCard, LoadingBlock, ReviewPager, REVIEW_PAGE_SIZE, ScoreBar, Stars, painScoreColor } from './ui'

export interface EvidenceDrawerProps {
  open: boolean
  onClose: () => void
  /** pain point driving the drawer (galaxy mode) */
  painPoint?: PainPoint
  /** plain title/description when opened without a pain point */
  title?: string
  description?: string
  /** optional explicit review ids to show (evolution parameter mode) */
  reviewIds?: string[]
  /** max reviews rendered inside the drawer */
  maxReviews?: number
  /** extra detail block rendered above the review list (parameter mode) */
  extraSection?: ReactNode
}

export function EvidenceDrawer({
  open,
  onClose,
  painPoint,
  title,
  description,
  reviewIds,
  maxReviews = 50,
  extraSection,
}: EvidenceDrawerProps) {
  const { t } = useI18n()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !painPoint) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setReviews([])
    setPage(1)
    api
      .evidence(painPoint.pain_point_id)
      .then((list) => {
        if (cancelled) return
        let shown = list
        if (reviewIds && reviewIds.length > 0) {
          const order = new Map(reviewIds.map((id, i) => [id, i]))
          shown = list
            .filter((r) => order.has(r.review_id))
            .sort((a, b) => (order.get(a.review_id) ?? 0) - (order.get(b.review_id) ?? 0))
          if (shown.length === 0) shown = list
        }
        setReviews(shown)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, painPoint, reviewIds])

  /* esc to close */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  /* pagination over the full evidence pool */
  const pool = reviews.slice(0, maxReviews)
  const pageCount = Math.max(1, Math.ceil(pool.length / REVIEW_PAGE_SIZE))
  const pageItems = pool.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE)
  const gotoPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), pageCount))
    listRef.current?.scrollTo({ top: 0 })
  }

  const heading = painPoint ? painLabel(painPoint) : (title ?? t('drawer.evidence'))
  const sub = painPoint
    ? t('drawer.subTitle', {
        name: painPoint.name,
        n: painPoint.review_count,
        score: painPoint.pain_score.toFixed(0),
      })
    : (description ?? '')

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={t('drawer.close')}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-line2 bg-base shadow-2xl fade-in">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">{t('drawer.evidence')}</p>
            <h3 className="mt-1 truncate text-base font-semibold tracking-tight text-ink">{heading}</h3>
            {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line2 bg-card p-1.5 text-muted transition hover:border-primary hover:text-ink"
            aria-label={t('drawer.closeShort')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {painPoint && (
          <div className="space-y-3 border-b border-line bg-card/60 px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Stars rating={painPoint.avg_rating} />
                avg {painPoint.avg_rating.toFixed(2)}
              </span>
              <span>share {(painPoint.share * 100).toFixed(1)}%</span>
              <span>severity {(painPoint.severity * 100).toFixed(0)}%</span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted">
                <span>{t('drawer.painScore')}</span>
                <span className="font-semibold" style={{ color: painScoreColor(painPoint.pain_score) }}>
                  {painPoint.pain_score.toFixed(1)} / 100
                </span>
              </div>
              <ScoreBar value={painPoint.pain_score} />
            </div>
          </div>
        )}

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {extraSection}
          {extraSection && <p className="pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
            {t('drawer.supportingReviews')}
          </p>}
          {loading && <LoadingBlock label={t('drawer.loading')} />}
          {!loading && error && <ErrorCard message={error} onRetry={onClose} />}
          {!loading && !error && pool.length === 0 && (
            <p className="py-10 text-center text-sm text-muted">{t('drawer.empty')}</p>
          )}
          {!loading && !error && pageItems.map((r) => (
            <ReviewCard key={r.review_id} review={r} keywords={painPoint?.keywords} />
          ))}
          {!loading && !error && pool.length > 0 && (
            <ReviewPager page={page} pageCount={pageCount} total={pool.length} onChange={gotoPage} />
          )}
        </div>

        {painPoint && (
          <footer className="border-t border-line px-5 py-4">
            <Link
              to={`/evidence?pain=${encodeURIComponent(painPoint.pain_point_id)}`}
              onClick={onClose}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-cyan"
            >
              {t('drawer.viewFull')}
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </footer>
        )}
      </aside>
    </div>
  )
}

/** small clickable badge showing evidence count (used in tables) */
export function EvidenceBadge({ count, onClick }: { count: number; onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
      title={t('drawer.viewReviews')}
    >
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h4m4 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L19 9.4V19a2 2 0 01-2 2z" />
      </svg>
      {count}
    </button>
  )
}
