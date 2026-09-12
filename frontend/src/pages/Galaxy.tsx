import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ArrowRight, ExternalLink, Pause, Play, RotateCcw, SlidersHorizontal } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { useAnalysis } from '../hooks/useAnalysis'
import { useChart, type ChartClickInfo } from '../hooks/useChart'
import { ensureGL, prefersReducedMotion, webglAvailable } from '../charts/gl'
import {
  buildEvidenceMap2D,
  buildPainLandscape3D,
  buildPainMatrix2D,
} from '../charts/painScatter'
import { painColor } from '../charts/theme'
import { useI18n, painLabel } from '../i18n'
import '../i18n/pages/galaxy'
import { AIInsight } from '../components/ChartCard'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { EmptyState, ErrorCard, ScoreBar, SkeletonBlock } from '../components/ui'

type ViewMode = '3d' | 'matrix' | 'evidence'

const DEFAULT_FILTERS = {
  minScore: 0,
  minSeverity: 0,
  minFrequency: 0,
  minEvidence: 0,
  rating: 'any' as 'any' | 'low' | 'mid',
}

function MetricRow({ label, value, bar }: { label: string; value: string; bar: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="tnum font-semibold text-ink">{value}</span>
      </div>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-base">
        <span className="block h-full rounded-full bg-primary/70 transition-all duration-500" style={{ width: `${Math.max(2, bar * 100)}%` }} />
      </div>
    </div>
  )
}

function FilterSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  format = (v: number) => String(v),
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  format?: (v: number) => string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-muted">{label}</span>
        <span className="tnum text-[11px] font-semibold text-ink">{format(value)}</span>
      </div>
      <input
        type="range"
        className="r2p-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  )
}

export function Galaxy() {
  const { analysis, loading, error, reload } = useAnalysis()
  const { t, lang } = useI18n()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView] = useState<ViewMode>('3d')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const [glReady, setGlReady] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    if (!webglAvailable() || prefersReducedMotion()) {
      setGlReady(false)
      return
    }
    ensureGL().then((ok) => {
      if (!cancelled) setGlReady(ok)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const painParam = searchParams.get('pain')

  const sortedPains = useMemo(
    () => (analysis ? [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score) : []),
    [analysis]
  )

  const filtered = useMemo(() => {
    return sortedPains.filter((p) => {
      if (p.pain_score < filters.minScore) return false
      if (p.severity * 100 < filters.minSeverity) return false
      if (p.frequency * 100 < filters.minFrequency) return false
      if (p.evidence_review_ids.length < filters.minEvidence) return false
      if (filters.rating === 'low' && p.avg_rating > 2.5) return false
      if (filters.rating === 'mid' && p.avg_rating > 3.5) return false
      return true
    })
  }, [sortedPains, filters])

  const selected = useMemo(() => {
    if (sortedPains.length === 0) return null
    return sortedPains.find((p) => p.pain_point_id === painParam) ?? filtered[0] ?? sortedPains[0]
  }, [sortedPains, filtered, painParam])

  /* keep URL in sync */
  useEffect(() => {
    if (selected && selected.pain_point_id !== painParam) {
      setSearchParams({ pain: selected.pain_point_id }, { replace: true })
    }
  }, [selected, painParam, setSearchParams])

  /* fall back to 2D matrix when GL is unavailable */
  useEffect(() => {
    if (glReady === false && view === '3d') setView('matrix')
  }, [glReady, view])

  const view3dOn = view === '3d' && glReady === true

  const option = useMemo<EChartsOption | null>(() => {
    if (!analysis || filtered.length === 0) return null
    if (view === '3d') return buildPainLandscape3D(filtered, false)
    if (view === 'matrix') return buildPainMatrix2D(filtered)
    return buildEvidenceMap2D(filtered)
  }, [analysis, filtered, view, lang])

  const [cont, chart] = useChart(
    option,
    (info: ChartClickInfo) => {
      const byName = (n?: string) => sortedPains.find((p) => p.display_name === n || p.name === n)
      let pp = byName(info.name)
      if (!pp) {
        const d = info.data as { name?: string } | undefined
        pp = byName(d?.name)
      }
      if (pp) setSearchParams({ pain: pp.pain_point_id }, { replace: true })
    },
    resetKey,
    /* 3D failed at runtime — drop to the 2D matrix view */
    (err) => {
      console.warn('[r2p] galaxy 3D failed, falling back to matrix', err)
      setGlReady(false)
      setView('matrix')
    }
  )

  useEffect(() => {
    if (!view3dOn) return
    chart.current?.setOption({ grid3D: { viewControl: { autoRotate } } })
  }, [autoRotate, view3dOn, option, resetKey, chart])

  /* insight: dynamic count of high-frequency + high-severity clusters */
  const insight = useMemo(() => {
    if (sortedPains.length === 0) return ''
    const freqs = sortedPains.map((p) => p.frequency)
    const sevs = sortedPains.map((p) => p.severity)
    const midF = (Math.min(...freqs) + Math.max(...freqs)) / 2
    const midS = (Math.min(...sevs) + Math.max(...sevs)) / 2
    const hot = sortedPains.filter((p) => p.frequency >= midF && p.severity >= midS)
    if (hot.length === 0) return t('galaxy.insight.spread')
    const names = hot.map((p) => painLabel(p)).join(t('galaxy.insight.sep'))
    return hot.length === 1
      ? t('galaxy.insight.one', { names })
      : t('galaxy.insight.many', { n: hot.length, names })
  }, [sortedPains, t, lang])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-16" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
          <SkeletonBlock className="h-[600px]" />
          <SkeletonBlock className="h-[600px]" />
          <SkeletonBlock className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (error || !analysis) {
    return <ErrorCard title={t('galaxy.errorTitle')} message={error ?? t('galaxy.errorNoData')} onRetry={reload} />
  }

  const rank = selected ? sortedPains.findIndex((p) => p.pain_point_id === selected.pain_point_id) + 1 : 0
  const rootCause = selected ? analysis.root_causes[selected.name] : undefined
  const provenance = { source: analysis.data_source, reviews: analysis.stats.total_reviews, generatedAt: analysis.generated_at }

  return (
    <div className="space-y-4 fade-in">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">{t('galaxy.eyebrow')}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{t('galaxy.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('galaxy.subtitle')}</p>
        </div>
        <div className="seg" role="tablist" aria-label={t('galaxy.viewModeAria')}>
          <button type="button" data-active={view === '3d'} onClick={() => setView('3d')} disabled={glReady === false}>
            {t('galaxy.view3d')}
          </button>
          <button type="button" data-active={view === 'matrix'} onClick={() => setView('matrix')}>
            {t('galaxy.viewMatrix')}
          </button>
          <button type="button" data-active={view === 'evidence'} onClick={() => setView('evidence')}>
            {t('galaxy.viewEvidence')}
          </button>
        </div>
      </div>

      <AIInsight text={insight} tag={t('galaxy.aiTag')} />

      {glReady === false && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800" role="status">
          <span aria-hidden>⚠</span>
          <span>{t('mri.glFallback')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr_300px]">
        {/* -------- filter rail -------- */}
        <aside className="h-fit rounded-2xl border border-line bg-card p-4 shadow-card lg:sticky lg:top-[116px]">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('galaxy.filters')}
            </p>
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-[11px] font-medium text-primary transition hover:text-primarydeep"
            >
              {t('galaxy.reset')}
            </button>
          </div>
          <div className="space-y-4">
            <FilterSlider
              label={t('galaxy.filter.minScore')}
              value={filters.minScore}
              onChange={(v) => setFilters((f) => ({ ...f, minScore: v }))}
            />
            <FilterSlider
              label={t('galaxy.filter.minSeverity')}
              value={filters.minSeverity}
              onChange={(v) => setFilters((f) => ({ ...f, minSeverity: v }))}
              format={(v) => `${v}%`}
            />
            <FilterSlider
              label={t('galaxy.filter.minFrequency')}
              value={filters.minFrequency}
              onChange={(v) => setFilters((f) => ({ ...f, minFrequency: v }))}
              format={(v) => `${v}%`}
            />
            <FilterSlider
              label={t('galaxy.filter.minEvidence')}
              value={filters.minEvidence}
              onChange={(v) => setFilters((f) => ({ ...f, minEvidence: v }))}
              max={20}
              step={1}
              format={(v) => (v === 0 ? t('galaxy.filter.any') : `≥ ${v}`)}
            />
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted">{t('galaxy.filter.rating')}</p>
              <select
                value={filters.rating}
                onChange={(e) => setFilters((f) => ({ ...f, rating: e.target.value as typeof f.rating }))}
                className="w-full rounded-lg border border-line bg-base2 px-2.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
              >
                <option value="any">{t('galaxy.rating.any')}</option>
                <option value="mid">{t('galaxy.rating.mid')}</option>
                <option value="low">{t('galaxy.rating.low')}</option>
              </select>
            </div>
          </div>
          <p className="tnum mt-4 border-t border-line pt-3 text-[11px] text-muted">
            {t('galaxy.filter.count', { shown: filtered.length, total: sortedPains.length })}
          </p>
        </aside>

        {/* -------- center visualization -------- */}
        <section className="chart-flex flex min-h-[620px] flex-col rounded-2xl border border-line bg-card shadow-card">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-3 pt-4">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-ink">
                {view === '3d' ? t('galaxy.chart.3d') : view === 'matrix' ? t('galaxy.chart.matrix') : t('galaxy.viewEvidence')}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {view === '3d'
                  ? t('galaxy.chart.3d.desc')
                  : view === 'matrix'
                    ? t('galaxy.chart.matrix.desc')
                    : t('galaxy.chart.evidence.desc')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {view3dOn && (
                <>
                  <button
                    type="button"
                    onClick={() => setAutoRotate((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                      autoRotate ? 'border-primary/50 bg-tint text-primary' : 'border-line bg-card text-muted hover:text-ink'
                    }`}
                  >
                    {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {t('galaxy.rotate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoRotate(false)
                      setResetKey((k) => k + 1)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('galaxy.reset')}
                  </button>
                </>
              )}
              <span className="tnum text-[11px] text-faint">{provenance.source === 'synthetic_demo' ? t('galaxy.sourceDemo') : "Amazon Reviews '23"}</span>
            </div>
          </header>
          <div className="min-h-0 flex-1 px-2 pb-3">
            {sortedPains.length === 0 ? (
              <EmptyState label={t('galaxy.empty.noPains')} />
            ) : filtered.length === 0 ? (
              <EmptyState label={t('galaxy.empty.filtered')} hint={t('galaxy.empty.filteredHint')} />
            ) : (
              <div ref={cont} className="h-[560px]" />
            )}
          </div>
        </section>

        {/* -------- right: selected pain point -------- */}
        <aside className="h-fit rounded-2xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-[116px]">
          {selected ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('galaxy.selected.title')}</p>
              <div className="mt-2.5 flex items-start gap-2.5">
                <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: painColor(selected.name) }} />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">{painLabel(selected)}</h3>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {t('galaxy.selected.rank', { rank, total: sortedPains.length, name: selected.name })}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-line bg-base2 p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-muted">{t('chart.painScore')}</span>
                  <span className="tnum text-2xl font-semibold text-ink">{selected.pain_score.toFixed(0)}</span>
                </div>
                <div className="mt-2">
                  <ScoreBar value={selected.pain_score} />
                </div>
              </div>

              <dl className="mt-4 space-y-3">
                <MetricRow label={t('chart.frequency')} value={`${(selected.frequency * 100).toFixed(0)}%`} bar={selected.frequency} />
                <MetricRow label={t('chart.severity')} value={`${(selected.severity * 100).toFixed(0)}%`} bar={selected.severity} />
                <MetricRow label={t('chart.helpfulness')} value={`${(selected.helpfulness * 100).toFixed(0)}%`} bar={selected.helpfulness} />
                <MetricRow label={t('galaxy.metric.recency')} value={`${(selected.recency * 100).toFixed(0)}%`} bar={selected.recency} />
                <div className="flex items-baseline justify-between border-t border-line pt-3 text-[11px]">
                  <span className="text-muted">{t('galaxy.metric.reviewCount')}</span>
                  <span className="tnum font-semibold text-ink">{selected.review_count.toLocaleString()}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted">{t('galaxy.metric.avgRating')}</span>
                  <span className="tnum font-semibold text-ink">{selected.avg_rating.toFixed(2)}★</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="text-muted">{t('chart.evidence')}</span>
                  <span className="tnum font-semibold text-ink">{t('galaxy.metric.evidenceReviews', { n: selected.evidence_review_ids.length })}</span>
                </div>
              </dl>

              <div className="mt-4">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{t('galaxy.keywords')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.keywords.slice(0, 8).map((k) => (
                    <span
                      key={k}
                      className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                      style={{ background: painColor(selected.name) + '14', color: painColor(selected.name) }}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {rootCause && (
                <div className="mt-4 space-y-2.5 rounded-xl border border-line bg-base2 p-3.5 text-[12px] leading-relaxed">
                  <p>
                    <span className="font-semibold text-ink">{t('galaxy.rootCause')}</span>
                    <span className="text-muted">{rootCause.root_cause}</span>
                  </p>
                  <p>
                    <span className="font-semibold text-ink">{t('galaxy.scenario')}</span>
                    <span className="text-muted">{rootCause.affected_scenario}</span>
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primarydeep"
              >
                {t('galaxy.viewEvidenceBtn')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to={`/evidence?pain=${encodeURIComponent(selected.pain_point_id)}`}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-4 py-2 text-xs font-medium text-muted transition hover:border-primary hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('galaxy.openInExplorer')}
              </Link>
            </div>
          ) : (
            <EmptyState label={t('galaxy.empty.select')} hint={t('galaxy.empty.selectHint')} />
          )}
        </aside>
      </div>

      <EvidenceDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} painPoint={selected ?? undefined} />
    </div>
  )
}
