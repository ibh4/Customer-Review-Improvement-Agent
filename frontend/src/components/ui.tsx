import type { ReactNode } from 'react'
import { painScoreColor } from '../charts/theme'
import { useI18n } from '../i18n'

/* ---------- review pagination ---------- */
export const REVIEW_PAGE_SIZE = 10

export function ReviewPager({
  page,
  pageCount,
  total,
  onChange,
}: {
  /** current page, 1-based */
  page: number
  pageCount: number
  total: number
  onChange: (p: number) => void
}) {
  const { t } = useI18n()
  if (pageCount <= 1) return null
  const a = (page - 1) * REVIEW_PAGE_SIZE + 1
  const b = Math.min(page * REVIEW_PAGE_SIZE, total)
  const btn =
    'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-card text-muted transition hover:border-primary hover:text-ink disabled:cursor-not-allowed disabled:opacity-35'
  return (
    <nav className="flex items-center justify-between gap-3 pt-1" aria-label={t('pager.page', { cur: page, total: pageCount })}>
      <button type="button" className={btn} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label={t('pager.prev')}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <p className="tnum text-xs text-muted">
        {t('pager.range', { a, b, n: total })} · {t('pager.page', { cur: page, total: pageCount })}
      </p>
      <button type="button" className={btn} onClick={() => onChange(page + 1)} disabled={page >= pageCount} aria-label={t('pager.next')}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  )
}

/* ---------- spinner ---------- */
export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin text-primary ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}

/* ---------- centered loading ---------- */
export function LoadingBlock({ label }: { label?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner className="h-7 w-7" />
      <span className="text-sm">{label ?? t('ui.loading')}</span>
    </div>
  )
}

/* ---------- error card with retry ---------- */
export function ErrorCard({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="rounded-2xl border border-line bg-card p-8 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange/10 text-orange">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
      </div>
      <h3 className="font-semibold tracking-tight text-ink">{title ?? t('ui.errorTitle')}</h3>
      <p className="mx-auto mt-1 max-w-md break-words text-sm text-muted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-base2 px-4 py-2 text-sm font-medium text-ink transition hover:border-primary hover:text-primary"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 9A8 8 0 006.3 6.3M4 15a8 8 0 0013.7 2.7" />
          </svg>
          {t('ui.retry')}
        </button>
      )}
    </div>
  )
}

/* ---------- empty state ---------- */
export function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 py-12 text-muted">
      <svg className="h-8 w-8 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5a3 3 0 01-6 0H4" />
      </svg>
      <span className="text-sm font-medium text-ink/70">{label}</span>
      {hint && <span className="max-w-sm text-center text-xs text-faint">{hint}</span>}
    </div>
  )
}

/* ---------- skeleton lines ---------- */
export function SkeletonBlock({ className = 'h-40' }: { className?: string }) {
  return <div className={`skeleton w-full ${className}`} />
}

/* ---------- star rating (1-5) ---------- */
export function Stars({ rating, className = 'h-3.5 w-3.5' }: { rating: number; className?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${rating.toFixed(1)} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = rating >= i - 0.25
        return (
          <svg
            key={i}
            className={`${className} ${filled ? 'text-orange' : 'text-line2'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.29 3.96a1 1 0 00.95.69h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 00-.36 1.12l1.28 3.96c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.96a1 1 0 00-.36-1.12L2.06 9.39c-.79-.57-.38-1.81.58-1.81h4.17a1 1 0 00.95-.69l1.29-3.96z" />
          </svg>
        )
      })}
    </span>
  )
}

/* ---------- thumbs-up helpful count ---------- */
export function HelpfulVotes({ count }: { count: number }) {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7 11v9m0-9l3.6-7.2A2 2 0 0112.4 3c1.5 0 2.6 1.4 2.2 2.8L13.6 10H18a2 2 0 012 2.4l-1.4 6A2 2 0 0116.7 20H7m0-9H4a1 1 0 00-1 1v7a1 1 0 001 1h3"
        />
      </svg>
      {t('ui.helpful', { n: count })}
    </span>
  )
}

/* ---------- data source badge (topbar / sidebar) ---------- */
export function DataSourceBadge({ dataSource, size = 'sm' }: { dataSource: string; size?: 'sm' | 'xs' }) {
  const { t } = useI18n()
  const synthetic = dataSource === 'synthetic_demo'
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  if (synthetic) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/10 font-medium text-orange ${pad}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-orange" />
        {t('ui.demoBadge')}
      </span>
    )
  }
  /* real-data badge renders as a fixed two-line stack so it never
     wraps mid-word inside the narrow topbar slot */
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 font-medium text-success ${pad}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-80">{t('ui.realBadgeTag')}</span>
        <span className="whitespace-nowrap text-[11px] font-semibold">{t('ui.realBadgeSource')}</span>
      </span>
    </span>
  )
}

/* ---------- llm mode badge ---------- */
export function LlmModeBadge({ mode }: { mode: 'mock' | 'real' }) {
  const { t } = useI18n()
  const real = mode === 'real'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        real ? 'border-accent/30 bg-accent/10 text-accent' : 'border-line bg-base2 text-muted'
      }`}
      title={real ? t('ui.llmRealTitle') : t('ui.llmRulesTitle')}
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      LLM: {real ? t('ui.llmReal') : t('ui.llmRules')}
    </span>
  )
}

export { painScoreColor }

/* ---------- score bar ---------- */
export function ScoreBar({
  value,
  max = 100,
  color,
  className = '',
}: {
  value: number
  max?: number
  color?: string
  className?: string
}) {
  const pct = Math.max(2, Math.min(100, (value / max) * 100))
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-base ${className}`}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color ?? painScoreColor(value) }} />
    </div>
  )
}

/* ---------- section card wrapper (light) ---------- */
export function Card({
  children,
  className = '',
  title,
  subtitle,
  actions,
  padded = true,
}: {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  actions?: ReactNode
  padded?: boolean
}) {
  return (
    <section className={`rounded-2xl border border-line bg-card shadow-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}
