import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Bot, Check, Pause, Play, RotateCcw } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { useAnalysis } from '../hooks/useAnalysis'
import { useTimeseries } from '../hooks/useTimeseries'
import { useChart, type ChartClickInfo } from '../hooks/useChart'
import { useProduct } from '../context/ProductContext'
import { useUi } from '../context/UiContext'
import type { PainPoint } from '../types'
import { ensureGL, prefersReducedMotion, webglAvailable } from '../charts/gl'
import { buildPainLandscape2D, buildPainLandscape3D, painTooltipHtml } from '../charts/painScatter'
import { PALETTE, RATING_COLORS, chartTheme, painColor, tooltipStyle } from '../charts/theme'
import { ChartCard, AIInsight } from '../components/ChartCard'
import { deriveGates } from '../components/AgentRunDrawer'
import { ProductVisual, productImageUrl } from '../components/ProductVisual'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { EmptyState, ErrorCard, ScoreBar, SkeletonBlock } from '../components/ui'
import { useI18n } from '../i18n'
import { painLabel, tr } from '../i18n/core'
import '../i18n/pages/mri'
import '../i18n/pages/agent'

/* ---------------------------------------------------------------- */
/* micro visualizations                                              */
/* ---------------------------------------------------------------- */
function Sparkline({ points, color, className = 'h-7' }: { points: number[]; color: string; className?: string }) {
  if (points.length < 2) return <div className={className} />
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const W = 120
  const H = 28
  const coords = points.map(
    (v, i) => `${((i / (points.length - 1)) * W).toFixed(1)},${(H - 3 - ((v - min) / range) * (H - 6)).toFixed(1)}`
  )
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full ${className}`} preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,${H} ${coords.join(' ')} ${W},${H}`} fill={color} opacity="0.08" />
      <polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={coords[coords.length - 1].split(',')[0]} cy={coords[coords.length - 1].split(',')[1]} r="2.2" fill={color} />
    </svg>
  )
}

function MiniBars({ items }: { items: { value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <div className="flex h-7 items-end gap-1" aria-hidden>
      {items.map((it, i) => (
        <span
          key={i}
          className="w-full rounded-sm"
          style={{ height: `${Math.max(12, (it.value / max) * 100)}%`, background: it.color, opacity: 0.85 }}
        />
      ))}
    </div>
  )
}

function MiniStacked({ parts }: { parts: { value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-base" aria-hidden>
      {parts.map((p, i) => (
        <span key={i} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  micro,
  microLabel,
  onClick,
  title,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  micro?: React.ReactNode
  microLabel?: string
  onClick?: () => void
  title?: string
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={`group flex flex-col rounded-2xl border border-line bg-card px-4 pb-3.5 pt-3.5 text-left shadow-card transition ${
        onClick ? 'cursor-pointer hover:border-primary/50 hover:shadow-pop' : ''
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="tnum mt-1.5 text-[26px] font-semibold leading-none tracking-tight" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[11px] text-muted">{sub}</p>}
      {micro && (
        <div className="mt-2.5">
          {micro}
          {microLabel && <p className="mt-1 text-[10px] text-faint">{microLabel}</p>}
        </div>
      )}
    </Tag>
  )
}

/* rating distribution — horizontal bars, 1–3★ jump to evidence */
function RatingBars({
  dist,
  onFilter,
}: {
  dist: Record<string, number>
  onFilter: (rating: number) => void
}) {
  const { t } = useI18n()
  const rows = [5, 4, 3, 2, 1].map((k) => ({ k, count: dist[String(k)] ?? 0 }))
  const total = rows.reduce((s, r) => s + r.count, 0) || 1
  const max = Math.max(...rows.map((r) => r.count), 1)
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`
  const pos = (dist['4'] ?? 0) + (dist['5'] ?? 0)
  const neu = dist['3'] ?? 0
  const neg = (dist['1'] ?? 0) + (dist['2'] ?? 0)
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <span className="tnum rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-medium text-success">
          Positive {pct(pos)}
        </span>
        <span className="tnum rounded-full border border-orange/30 bg-orange/10 px-2.5 py-0.5 text-[11px] font-medium text-orange">
          Neutral {pct(neu)}
        </span>
        <span className="tnum rounded-full border border-red/30 bg-red/10 px-2.5 py-0.5 text-[11px] font-medium text-red">
          Negative {pct(neg)}
        </span>
      </div>
      <ul className="space-y-2">
        {rows.map(({ k, count }) => {
          const clickable = k <= 3
          const inner = (
            <>
              <span className="flex w-10 shrink-0 items-center gap-1 text-[11px] font-medium text-muted">
                {k}
                <svg className="h-3 w-3 text-orange" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.29 3.96a1 1 0 00.95.69h4.16c.97 0 1.37 1.24.59 1.81l-3.37 2.45a1 1 0 00-.36 1.12l1.28 3.96c.3.92-.75 1.69-1.54 1.12l-3.36-2.44a1 1 0 00-1.18 0l-3.36 2.44c-.79.57-1.84-.2-1.54-1.12l1.28-3.96a1 1 0 00-.36-1.12L2.06 9.39c-.79-.57-.38-1.81.58-1.81h4.17a1 1 0 00.95-.69l1.29-3.96z" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block h-[14px] w-full overflow-hidden rounded-[4px] bg-base">
                  <span
                    className="block h-full rounded-[4px] transition-all duration-500"
                    style={{ width: `${(count / max) * 100}%`, background: RATING_COLORS[String(k)] }}
                  />
                </span>
              </span>
              <span className="tnum w-20 shrink-0 text-right text-[11px] text-muted">
                {count.toLocaleString()} · {pct(count)}
              </span>
            </>
          )
          return (
            <li key={k}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onFilter(k)}
                  className="group flex w-full items-center gap-2.5 rounded-lg px-1.5 py-0.5 transition hover:bg-tint"
                  title={t('mri.viewRatingReviews', { k })}
                >
                  {inner}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 px-1.5 py-0.5">{inner}</div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="mt-3 text-[10px] text-faint">{t('mri.clickHint')}</p>
    </div>
  )
}

/* ---------------------------------------------------------------- */

type DynMode = 'volume' | 'rating' | 'negative'

function fmtDate(ts: number | string): string {
  const d = new Date(Number(ts) * 1000)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
}

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(2)}K` : String(n)
}

export function ProductMRI() {
  const { analysis, loading, error, reload } = useAnalysis()
  const { currentProduct, products, setProduct } = useProduct()
  const { setAgentRunOpen } = useUi()
  const timeseries = useTimeseries()
  const navigate = useNavigate()
  const { t, lang } = useI18n()

  /* agent gates for the status card */
  const agentGates = useMemo(() => (analysis ? deriveGates(analysis) : null), [analysis])

  /* 3D landscape state */
  const [glReady, setGlReady] = useState<boolean | null>(null)
  const [use3d, setUse3d] = useState(true)
  const [glFallback, setGlFallback] = useState(false)
  const [autoRotate, setAutoRotate] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [drawerPain, setDrawerPain] = useState<PainPoint | null>(null)

  const [dynMode, setDynMode] = useState<DynMode>('volume')

  /* lazy-load echarts-gl only on this page */
  useEffect(() => {
    let cancelled = false
    const reduce = prefersReducedMotion()
    if (!webglAvailable() || reduce) {
      setGlReady(false)
      setUse3d(false)
      return
    }
    ensureGL().then((ok) => {
      if (!cancelled) {
        setGlReady(ok)
        if (!ok) setUse3d(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const landscape3dOn = use3d && glReady === true

  /* ---------------- derived KPIs ---------------- */
  const kpis = useMemo(() => {
    if (!analysis) return null
    const { stats, pain_points: pps, product_v2 } = analysis
    const negativeShare = stats.total_reviews > 0 ? stats.negative_reviews / stats.total_reviews : 0
    const health = Math.max(0, 100 - negativeShare * 100)
    const painIndex = pps.length > 0 ? Math.max(...pps.map((p) => p.pain_score)) : 0
    const critical = pps.filter((p) => p.pain_score >= 60).length
    const evidenceIds = new Set(pps.flatMap((p) => p.evidence_review_ids))
    const coverage = stats.negative_reviews > 0 ? Math.min(1, evidenceIds.size / stats.negative_reviews) : 0
    return {
      health,
      painIndex,
      critical,
      coverage,
      opportunities: product_v2.parameters.length,
      negativeShare,
    }
  }, [analysis])

  /* monthly series for sparklines / dynamics */
  const monthly = useMemo(() => {
    const ts = timeseries.data ?? []
    return {
      months: ts.map((t) => t.month),
      volume: ts.map((t) => t.count),
      rating: ts.map((t) => t.avg_rating),
      health: ts.map((t) => (t.count > 0 ? 100 - (t.negative / t.count) * 100 : 100)),
      negativeShare: ts.map((t) => (t.count > 0 ? (t.negative / t.count) * 100 : 0)),
    }
  }, [timeseries.data])

  /* ---------------- charts ---------------- */
  const painDistOption = useMemo<EChartsOption | null>(() => {
    if (!analysis) return null
    const pps = [...analysis.pain_points].sort((a, b) => a.pain_score - b.pain_score)
    return {
      backgroundColor: 'transparent',
      grid: { left: 10, right: 42, top: 10, bottom: 6, containLabel: true },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(79,124,255,0.06)' } },
        formatter: (params: unknown) => {
          const pr = (Array.isArray(params) ? params[0] : params) as { name?: string }
          const p = analysis.pain_points.find((x) => x.display_name === pr.name)
          return p ? painTooltipHtml(p) : String(pr.name ?? '')
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
        axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
        splitLine: { lineStyle: { color: chartTheme.splitLine } },
      },
      yAxis: {
        type: 'category',
        data: pps.map((p) => painLabel(p)),
        axisLine: { lineStyle: { color: chartTheme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: chartTheme.textBright, fontSize: 11, width: 130, overflow: 'truncate' },
      },
      series: [
        {
          type: 'bar',
          cursor: 'pointer',
          data: pps.map((p) => ({
            value: Number(p.pain_score.toFixed(1)),
            itemStyle: { color: painColor(p.name), borderRadius: [0, 5, 5, 0], opacity: 0.9 },
          })),
          barMaxWidth: 20,
          label: {
            show: true,
            position: 'right',
            color: chartTheme.textMuted,
            fontSize: 11,
            formatter: '{c}',
          },
        },
      ],
    }
  }, [analysis, lang])

  const dynOption = useMemo<EChartsOption | null>(() => {
    const ts = timeseries.data
    if (!ts || ts.length === 0) return null
    const months = monthly.months
    const rotate = months.length > 14 ? 38 : 0
    const common = {
      backgroundColor: 'transparent',
      grid: { left: 12, right: 20, top: 26, bottom: 12, containLabel: true },
      tooltip: {
        ...tooltipStyle,
        trigger: 'axis' as const,
        axisPointer: { type: 'line' as const, lineStyle: { color: '#B9C2D4' } },
        formatter: (params: unknown) => {
          const pr = (Array.isArray(params) ? params[0] : params) as { dataIndex?: number }
          const i = pr.dataIndex ?? 0
          const t = ts[i]
          if (!t) return ''
          const negShare = t.count > 0 ? (t.negative / t.count) * 100 : 0
          return (
            `<b>${t.month}</b><br/>${tr('mri.ttReviews')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${t.count}</b><br/>` +
            `${tr('mri.ttAvgRating')}&nbsp;&nbsp;<b>${t.avg_rating.toFixed(2)}★</b><br/>` +
            `${tr('mri.ttNegShare')}&nbsp;&nbsp;<b>${negShare.toFixed(0)}%</b>`
          )
        },
      },
      xAxis: {
        type: 'category' as const,
        data: months,
        axisLine: { lineStyle: { color: chartTheme.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: chartTheme.textMuted, fontSize: 10, rotate, hideOverlap: true },
      },
    }
    if (dynMode === 'volume') {
      return {
        ...common,
        yAxis: {
          type: 'value',
          name: tr('mri.dynYVolume'),
          nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
          axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: chartTheme.splitLine } },
        },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 5,
            data: monthly.volume,
            lineStyle: { color: PALETTE.blue, width: 2.5 },
            itemStyle: { color: PALETTE.blue },
            areaStyle: { color: 'rgba(79,124,255,0.10)' },
            animationDuration: 450,
          },
        ],
      }
    }
    if (dynMode === 'rating') {
      return {
        ...common,
        yAxis: {
          type: 'value',
          name: tr('mri.dynYRating'),
          min: (v: { min: number }) => Math.max(1, Math.floor(v.min) - 0.5),
          max: 5,
          axisLabel: { color: chartTheme.textMuted, fontSize: 11, formatter: '{value}★' },
          axisLine: { show: false },
          splitLine: { lineStyle: { color: chartTheme.splitLine } },
        },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 5,
            data: monthly.rating.map((r) => Number(r.toFixed(2))),
            lineStyle: { color: PALETTE.green, width: 2.5 },
            itemStyle: { color: PALETTE.green },
            areaStyle: { color: 'rgba(36,180,126,0.08)' },
            animationDuration: 450,
          },
        ],
      }
    }
    return {
      ...common,
      yAxis: {
        type: 'value',
        name: tr('mri.dynYNegative'),
        min: 0,
        max: 100,
        axisLabel: { color: chartTheme.textMuted, fontSize: 11, formatter: '{value}%' },
        axisLine: { show: false },
        splitLine: { lineStyle: { color: chartTheme.splitLine } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 5,
          data: monthly.negativeShare.map((v) => Number(v.toFixed(1))),
          lineStyle: { color: PALETTE.red, width: 2.5 },
          itemStyle: { color: PALETTE.red },
          areaStyle: { color: 'rgba(234,91,91,0.08)' },
          animationDuration: 450,
        },
      ],
    }
  }, [timeseries.data, dynMode, monthly, lang])

  const landscapeOption = useMemo<EChartsOption | null>(() => {
    if (!analysis || analysis.pain_points.length === 0) return null
    return landscape3dOn
      ? buildPainLandscape3D(analysis.pain_points, false)
      : buildPainLandscape2D(analysis.pain_points)
  }, [analysis, landscape3dOn, lang])

  /* 缺点雷达：差评占比 vs 痛点分数双系列对比（形状由真实数据决定，点击维度查看证据） */
  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!analysis || analysis.pain_points.length === 0) return null
    const pains = [...analysis.pain_points].sort((a, b) => b.share - a.share).slice(0, 6)
    const maxShare = Math.max(...pains.map((p) => p.share * 100), 10)
    const maxScore = Math.max(...pains.map((p) => p.pain_score), 10)
    return {
      backgroundColor: 'transparent',
      tooltip: {
        ...tooltipStyle,
        trigger: 'item',
        formatter: (params: unknown) => {
          const pr = params as { dataIndex?: number }
          const p = pains[pr.dataIndex ?? -1]
          if (!p) return ''
          return (
            `<b style="color:${painColor(p.name)}">●</b> <b>${painLabel(p)}</b><br/>` +
            `${tr('mri.radarShare')}&nbsp;&nbsp;<b>${(p.share * 100).toFixed(1)}%</b><br/>` +
            `${tr('chart.painScore')}&nbsp;&nbsp;<b>${p.pain_score.toFixed(0)}</b><br/>` +
            `${tr('mri.radarReviews')}&nbsp;&nbsp;<b>${p.review_count}</b>`
          )
        },
      },
      legend: {
        bottom: 0,
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: chartTheme.textMuted, fontSize: 11 },
        data: [tr('mri.radarShare'), tr('chart.painScore')],
      },
      radar: {
        indicator: pains.map((p) => ({ name: painLabel(p), max: 100 })),
        radius: '58%',
        center: ['50%', '48%'],
        splitNumber: 4,
        axisName: { color: chartTheme.textBright, fontSize: 11 },
        splitLine: { lineStyle: { color: chartTheme.splitLine } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: chartTheme.splitLine } },
      },
      series: [
        {
          type: 'radar',
          symbolSize: 4,
          data: [
            {
              /* 差评占比（相对最大值归一化，突出形状差异） */
              name: tr('mri.radarShare'),
              value: pains.map((p) => Math.round((p.share * 100 / maxShare) * 100)),
              itemStyle: { color: PALETTE.red },
              lineStyle: { color: PALETTE.red, width: 2 },
              areaStyle: { color: PALETTE.red, opacity: 0.18 },
            },
            {
              /* 痛点分数（同样归一化） */
              name: tr('chart.painScore'),
              value: pains.map((p) => Math.round((p.pain_score / maxScore) * 100)),
              itemStyle: { color: PALETTE.blue },
              lineStyle: { color: PALETTE.blue, width: 2 },
              areaStyle: { color: PALETTE.blue, opacity: 0.12 },
            },
          ],
        },
      ],
    }
  }, [analysis, lang])

  const [distCont] = useChart(painDistOption, (info) => {
    const pp = analysis?.pain_points.find((p) => p.display_name === info.name || p.name === info.name)
    if (pp) navigate(`/galaxy?pain=${encodeURIComponent(pp.pain_point_id)}`)
  })
  const [radarCont] = useChart(radarOption, (info) => {
    const pp = analysis?.pain_points.find((p) => p.display_name === info.name || p.name === info.name)
    if (pp) setDrawerPain(pp)
  })
  const [dynCont] = useChart(dynOption)
  const [landCont, landChart] = useChart(
    landscapeOption,
    (info: ChartClickInfo) => {
      const pps = analysis?.pain_points ?? []
      const byName = (n?: string) => pps.find((p) => p.display_name === n || p.name === n)
      let pp = byName(info.name)
      if (!pp) {
        const d = info.data as { name?: string } | undefined
        pp = byName(d?.name)
      }
      if (pp) setDrawerPain(pp)
    },
    resetKey,
    /* 3D died at runtime (driver blocklist / dead context) — drop to 2D */
    (err) => {
      console.warn('[r2p] 3D landscape failed, falling back to 2D', err)
      setGlReady(false)
      setUse3d(false)
      setGlFallback(true)
    }
  )

  /* GPU context yanked mid-session (RDP disconnect, driver reset) → 2D */
  useEffect(() => {
    const el = landCont.current
    if (!el) return
    const onLost = (e: Event) => {
      e.preventDefault()
      setGlReady(false)
      setUse3d(false)
      setGlFallback(true)
    }
    el.addEventListener('webglcontextlost', onLost, true)
    return () => el.removeEventListener('webglcontextlost', onLost, true)
  }, [landCont, analysis != null, landscape3dOn])

  /* apply autoRotate without rebuilding the whole option */
  useEffect(() => {
    if (!landscape3dOn) return
    landChart.current?.setOption({ grid3D: { viewControl: { autoRotate } } })
  }, [autoRotate, landscape3dOn, landscapeOption, resetKey, landChart])

  /* ---------------- render states ---------------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-44" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[5fr_7fr]">
          <SkeletonBlock className="h-[320px]" />
          <SkeletonBlock className="h-[320px]" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_5fr]">
          <SkeletonBlock className="h-[430px]" />
          <div className="space-y-4">
            <SkeletonBlock className="h-40" />
            <SkeletonBlock className="h-[262px]" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !analysis || !kpis) {
    return <ErrorCard title={t('mri.errorTitle')} message={error ?? t('mri.errorNoData')} onRetry={reload} />
  }

  const [minTs, maxTs] = analysis.stats.date_range
  const sortedPains = [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score)
  const top = sortedPains[0]
  const maxEvidence = Math.max(...analysis.pain_points.map((p) => p.evidence_review_ids.length), 1)
  const provenance = {
    source: analysis.data_source,
    reviews: analysis.stats.total_reviews,
    generatedAt: analysis.generated_at,
  }
  const healthLabel =
    kpis.health >= 80 ? t('mri.healthGood') : kpis.health >= 60 ? t('mri.healthModerate') : t('mri.healthAtRisk')
  const healthColor = kpis.health >= 80 ? PALETTE.green : kpis.health >= 60 ? PALETTE.orange : PALETTE.red

  return (
    <div className="space-y-4 fade-in">
      {/* ============ HERO ============ */}
      <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="flex flex-col-reverse items-stretch gap-6 md:flex-row md:items-center">
          <div className="min-w-0 flex-1 px-6 py-6 md:px-8 md:py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{t('mri.heroEyebrow')}</p>
            <h1 className="mt-2.5 text-[28px] font-semibold leading-tight tracking-tight text-ink md:text-[32px]">
              {t('mri.heroTitle1')}
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('mri.heroTitle2')}
              </span>
            </h1>
            <p className="tnum mt-3.5 text-[13px] leading-relaxed text-muted">
              {t('mri.statAnalyzing')} <b className="text-ink">{analysis.stats.total_reviews.toLocaleString()}</b>{' '}
              {t('mri.statReviews')} · <b className="text-ink">{analysis.pain_points.length}</b>{' '}
              {t('mri.statClusters')} · <b className="text-ink">{kpis.opportunities}</b>{' '}
              {t('mri.statOpportunities')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-muted">
              <span className="tnum rounded-md border border-line bg-base px-2 py-1">
                {fmtDate(minTs)} → {fmtDate(maxTs)}
              </span>
              <span className="rounded-md border border-line bg-base px-2 py-1">
                {analysis.llm_mode === 'real' ? t('mri.llmEnhanced') : t('mri.ruleBased')} ·{' '}
                {analysis.stats.cluster_method}
              </span>
              <span className="tnum rounded-md border border-line bg-base px-2 py-1">
                {t('mri.negativeReviewsChip', { n: analysis.stats.negative_reviews.toLocaleString() })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-4 px-6 pb-6 pt-6 md:flex-row md:items-center md:gap-6 md:py-7 md:pl-0 md:pr-8">
            {/* 产品名：中文大字 + 英文原名，紧贴产品图左侧 */}
            <div className="max-w-[280px] text-center md:text-right">
              <p className="text-[20px] font-bold leading-snug text-ink md:text-[22px]">
                {analysis.product_title_zh ?? analysis.product_title}
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted" title={analysis.product_title}>
                {analysis.product_title}
              </p>
            </div>
            <ProductVisual
              category={analysis.category}
              title={analysis.product_title}
              imageUrl={productImageUrl(analysis.product_id)}
              className="h-44 w-40"
              label={`ASIN ${analysis.product_id}`}
            />
          </div>
        </div>
      </section>

      {/* ============ KPI ROW ============ */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={t('mri.kpiHealth')}
          value={kpis.health.toFixed(1)}
          sub={healthLabel}
          accent={healthColor}
          micro={<Sparkline points={monthly.health} color={healthColor} />}
          microLabel={t('mri.kpiHealthMicro')}
        />
        <KpiCard
          label={t('mri.kpiPainIndex')}
          value={kpis.painIndex.toFixed(0)}
          sub={t('mri.kpiPainSub', { n: analysis.pain_points.length })}
          accent={PALETTE.violet}
          micro={
            <MiniBars
              items={sortedPains.map((p) => ({ value: p.pain_score, color: painColor(p.name) }))}
            />
          }
          microLabel={t('mri.kpiPainMicro')}
        />
        <KpiCard
          label={t('mri.kpiAvgRating')}
          value={analysis.stats.avg_rating.toFixed(2)}
          sub={t('mri.kpiAvgRatingSub')}
          micro={<Sparkline points={monthly.rating} color={PALETTE.green} />}
          microLabel={t('mri.kpiAvgRatingMicro')}
        />
        <KpiCard
          label={t('mri.kpiReviews')}
          value={fmtK(analysis.stats.total_reviews)}
          sub={t('mri.kpiReviewsSub', {
            n: analysis.stats.total_reviews.toLocaleString(),
            kind: t(currentProduct?.data_source === 'synthetic_demo' ? 'mri.demoData' : 'mri.realData'),
          })}
          micro={<Sparkline points={monthly.volume} color={PALETTE.blue} />}
          microLabel={t('mri.kpiReviewsMicro')}
        />
        <KpiCard
          label={t('mri.kpiCritical')}
          value={String(kpis.critical)}
          sub={t('mri.kpiCriticalSub')}
          accent={PALETTE.red}
          micro={
            <MiniStacked
              parts={[
                { value: kpis.critical, color: PALETTE.red },
                { value: Math.max(0, analysis.pain_points.length - kpis.critical), color: '#D8DEE9' },
              ]}
            />
          }
          microLabel={t('mri.kpiCriticalMicro', { c: kpis.critical, n: analysis.pain_points.length })}
        />
        <KpiCard
          label={t('mri.kpiCoverage')}
          value={`${(kpis.coverage * 100).toFixed(0)}%`}
          sub={t('mri.kpiCoverageSub')}
          accent={PALETTE.cyan}
          micro={<ScoreBar value={kpis.coverage * 100} color={PALETTE.cyan} />}
          microLabel={t('mri.kpiCoverageMicro')}
        />
      </div>

      {/* ============ PRODUCT PORTFOLIO ============ */}
      <section className="rounded-2xl border border-line bg-card p-4 shadow-card md:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Product portfolio</p>
            <h2 className="mt-1 text-[17px] font-semibold text-ink">All analyzed products</h2>
            <p className="mt-1 text-[11px] text-muted">
              {products.length} products · {products.reduce((sum, p) => sum + p.review_count, 0).toLocaleString()} review records · select a product to refresh every page
            </p>
          </div>
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">
            Amazon Reviews '23 · real data
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          {products.map((p) => {
            const active = p.product_id === currentProduct?.product_id
            return (
              <button
                key={p.product_id}
                type="button"
                onClick={() => {
                  setProduct(p.product_id)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`group overflow-hidden rounded-xl border text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-pop ${
                  active ? 'border-primary bg-tint shadow-sm' : 'border-line bg-base'
                }`}
                title={p.product_title}
              >
                <ProductVisual
                  category={p.category}
                  title={p.product_title}
                  imageUrl={productImageUrl(p.product_id)}
                  float={false}
                  className="h-24 w-full rounded-none border-0 border-b border-line"
                />
                <div className="p-2">
                  <p className="line-clamp-2 min-h-[28px] text-[10px] font-medium leading-snug text-ink">
                    {p.product_title}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between gap-1 text-[9px] text-muted">
                    <span className="truncate">{p.product_id}</span>
                    <span className="tnum shrink-0">{p.review_count.toLocaleString()}</span>
                  </div>
                  {active && <span className="mt-1 inline-block text-[9px] font-semibold text-primary">ACTIVE PRODUCT</span>}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* ============ AGENT STATUS ============ */}
      {agentGates && (
        <button
          type="button"
          onClick={() => setAgentRunOpen(true)}
          className="group flex w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-violet/30 bg-gradient-to-r from-violet/[0.06] via-card to-primary/[0.05] px-5 py-3.5 text-left shadow-card transition hover:border-primary/50 hover:shadow-pop"
          title={t('agent.runTitle')}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet/15 text-violet">
              <Bot className="h-4 w-4" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet">Agent Status</span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            {t('agent.mriCard.done')}
          </span>
          <span className="tnum text-[12px] text-muted">
            {t('agent.mriCard.stats', {
              reviews: analysis.stats.total_reviews.toLocaleString(),
              pains: analysis.pain_points.length,
              params: agentGates.total,
            })}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${
              agentGates.evidenceGatePass
                ? 'border-success/50 bg-success/10 text-success'
                : 'border-orange/50 bg-orange/10 text-orange'
            }`}
          >
            {agentGates.evidenceGatePass && <Check className="h-3 w-3" />}
            {t('agent.s3.gate')} {agentGates.evidenceGatePass ? t('agent.s3.pass') : t('agent.s6.needHuman')}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-primary transition group-hover:gap-2">
            {t('agent.mriCard.open')}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* ============ AI INSIGHT ============ */}
      {top && (
        <AIInsight
          text={t('mri.insightTop', {
            name: painLabel(top),
            score: top.pain_score.toFixed(0),
            n: top.review_count.toLocaleString(),
            pct: (top.share * 100).toFixed(0),
          })}
          tag={t('mri.insightTag')}
        />
      )}

      {/* ============ PAIN DISTRIBUTION | REVIEW DYNAMICS ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[5fr_7fr]">
        <ChartCard
          title={t('mri.distTitle')}
          description={t('mri.distDesc')}
          provenance={provenance}
          className="min-h-[320px]"
        >
          {analysis.pain_points.length === 0 ? (
            <EmptyState label={t('mri.emptyPains')} hint={t('mri.emptyPainsHint')} />
          ) : (
            <div ref={distCont} className="h-[280px]" />
          )}
        </ChartCard>

        <ChartCard
          title={t('mri.dynTitle')}
          description={t('mri.dynDesc')}
          provenance={provenance}
          controls={
            <div className="seg" role="tablist" aria-label={t('mri.dynAria')}>
              {(
                [
                  ['volume', t('mri.dynVolume')],
                  ['rating', t('mri.dynRating')],
                  ['negative', t('mri.dynNegative')],
                ] as [DynMode, string][]
              ).map(([m, label]) => (
                <button key={m} type="button" data-active={dynMode === m} onClick={() => setDynMode(m)} role="tab">
                  {label}
                </button>
              ))}
            </div>
          }
          className="min-h-[320px]"
        >
          {timeseries.loading ? (
            <SkeletonBlock className="h-[280px]" />
          ) : dynOption ? (
            <div ref={dynCont} className="h-[280px]" />
          ) : (
            <EmptyState
              label={t('mri.dynUnavailable')}
              hint={t('mri.dynUnavailableHint')}
            />
          )}
        </ChartCard>
      </div>

      {/* ============ 3D LANDSCAPE | RATING + EVIDENCE STRENGTH ============ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[7fr_5fr]">
        <ChartCard
          title={t('mri.landTitle')}
          description={t('mri.landDesc')}
          provenance={provenance}
          controls={
            <div className="flex items-center gap-2">
              <div className="seg" role="tablist" aria-label={t('mri.toggle2d3d')}>
                <button
                  type="button"
                  data-active={!use3d}
                  onClick={() => {
                    setUse3d(false)
                    setAutoRotate(false)
                  }}
                  disabled={false}
                >
                  2D
                </button>
                <button
                  type="button"
                  data-active={use3d}
                  onClick={() => setUse3d(true)}
                  disabled={glReady === false}
                  title={glReady === false ? t('mri.no3dTitle') : undefined}
                >
                  3D
                </button>
              </div>
              <button
                type="button"
                onClick={() => setAutoRotate((v) => !v)}
                disabled={!landscape3dOn}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  autoRotate
                    ? 'border-primary/50 bg-tint text-primary'
                    : 'border-line bg-card text-muted hover:text-ink'
                }`}
                title={t('mri.autoRotate')}
              >
                {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {t('mri.rotate')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoRotate(false)
                  setResetKey((k) => k + 1)
                }}
                disabled={!landscape3dOn}
                className="inline-flex items-center gap-1 rounded-lg border border-line bg-card px-2 py-1.5 text-[11px] font-medium text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                title={t('mri.resetCamera')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('mri.reset')}
              </button>
            </div>
          }
          className="chart-flex min-h-[430px]"
        >
          {analysis.pain_points.length === 0 ? (
            <EmptyState label={t('mri.emptyMap')} />
          ) : (
            <>
              {(glReady === false || glFallback) && (
                <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-800" role="status">
                  <span aria-hidden>⚠</span>
                  <span>{t('mri.glFallback')}</span>
                </div>
              )}
              <div ref={landCont} className="h-[420px]" />
            </>
          )}
        </ChartCard>

        <div className="flex flex-col gap-4">
          <ChartCard
            title={t('mri.ratingTitle')}
            description={t('mri.ratingDesc')}
            provenance={provenance}
          >
            <RatingBars
              dist={analysis.stats.rating_distribution}
              onFilter={(r) => navigate(`/evidence?rating=${r}`)}
            />
          </ChartCard>

          <ChartCard
            title={t('mri.radarTitle')}
            description={t('mri.radarDesc')}
            provenance={provenance}
          >
            <div ref={radarCont} className="h-[250px]" />
          </ChartCard>

          <ChartCard
            title={t('mri.evidenceTitle')}
            description={t('mri.evidenceDesc')}
            provenance={provenance}
            className="min-h-0 flex-1"
          >
            <ul className="space-y-2.5 px-2 pb-1">
              {sortedPains.map((p) => (
                <li key={p.pain_point_id}>
                  <button
                    type="button"
                    onClick={() => setDrawerPain(p)}
                    className="group w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-tint"
                    title={t('mri.viewEvidence')}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: painColor(p.name) }} />
                        <span className="truncate text-[12px] font-medium text-ink">{painLabel(p)}</span>
                      </span>
                      <span className="tnum shrink-0 text-[11px] text-muted">
                        {t('mri.evidenceCount', { n: p.evidence_review_ids.length })}
                      </span>
                    </span>
                    <span className="mt-1.5 block">
                      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-base">
                        <span
                          className="block h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(4, (p.evidence_review_ids.length / maxEvidence) * 100)}%`,
                            background: painColor(p.name),
                          }}
                        />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ChartCard>
        </div>
      </div>

      <DataProvenanceInlineFooter analysis={analysis} />

      {/* evidence drawer for clicked 3D bubble */}
      <EvidenceDrawer open={drawerPain !== null} onClose={() => setDrawerPain(null)} painPoint={drawerPain ?? undefined} />
    </div>
  )
}

function DataProvenanceInlineFooter({ analysis }: { analysis: import('../types').Analysis }) {
  const { t } = useI18n()
  return (
    <p className="px-1 text-[11px] text-faint">
      {t('mri.footer', {
        source: t(analysis.data_source === 'synthetic_demo' ? 'mri.footerDemo' : 'mri.footerReal'),
        time: analysis.generated_at.slice(0, 16).replace('T', ' '),
        id: analysis.product_id,
      })}
    </p>
  )
}
