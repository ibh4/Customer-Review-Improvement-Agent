import { useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'

/* ============================================================
 * DataProvenance — "ⓘ DATA" hover card proving real-data origin
 * ============================================================ */
export function DataProvenance({
  source,
  reviews,
  generatedAt,
  extra,
}: {
  source: string
  reviews: number
  generatedAt?: string
  extra?: string
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const label = source === 'synthetic_demo' ? t('prov.demoLabel') : t('prov.amazonLabel')
  return (
    <div className="relative inline-block" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-faint transition hover:bg-base hover:text-muted"
        aria-label={t('prov.data')}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5M12 7.5h.01" />
        </svg>
        {t('prov.data')}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-60 rounded-xl border border-line bg-card p-3.5 text-xs shadow-pop slide-in">
          <dl className="space-y-2">
            <div className="flex justify-between gap-3">
              <dt className="text-faint">{t('prov.source')}</dt>
              <dd className="text-right font-medium text-ink">{label}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-faint">{t('prov.reviews')}</dt>
              <dd className="tnum text-right font-medium text-ink">{reviews.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-faint">{t('prov.dataType')}</dt>
              <dd className="text-right font-medium text-ink">
                {source === 'synthetic_demo' ? t('prov.synthetic') : t('prov.real')}
              </dd>
            </div>
            {generatedAt && (
              <div className="flex justify-between gap-3">
                <dt className="text-faint">{t('prov.lastAnalysis')}</dt>
                <dd className="tnum text-right font-medium text-ink">{generatedAt.slice(0, 16).replace('T', ' ')}</dd>
              </div>
            )}
            {extra && <p className="border-t border-line pt-2 text-[11px] leading-relaxed text-faint">{extra}</p>}
          </dl>
        </div>
      )}
    </div>
  )
}

/* ============================================================
 * ChartCard — unified card header:
 *   Title / description          [controls]  ⓘ DATA
 * ============================================================ */
export function ChartCard({
  title,
  description,
  controls,
  provenance,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string
  description?: string
  controls?: ReactNode
  provenance?: { source: string; reviews: number; generatedAt?: string; extra?: string }
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={`flex flex-col rounded-2xl border border-line bg-card shadow-card ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {controls}
          {provenance && <DataProvenance {...provenance} />}
        </div>
      </header>
      <div className={`min-h-0 flex-1 px-2 pb-3 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

/* ============================================================
 * AIInsight — rule-generated highlight sentence (no fake claims)
 * ============================================================ */
export function AIInsight({ text, tag }: { text: string; tag?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-gradient-to-r from-accent/[0.07] via-tint to-transparent px-5 py-4">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10l1.4 1.4M3 12h2m14 0h2M5.6 18.4L7 17m10-10l1.4-1.4" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">{tag ?? t('ai.insightTag')}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink/90">{text}</p>
      </div>
    </div>
  )
}
