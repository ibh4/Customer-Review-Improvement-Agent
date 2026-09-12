import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Bot, Info, Search, ShieldCheck, Target, Wrench } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { useAnalysis } from '../hooks/useAnalysis'
import { useChart } from '../hooks/useChart'
import type { ParameterUpgrade } from '../types'
import { painLabel, productLabel, useI18n } from '../i18n'
import '../i18n/pages/evolution'
import '../i18n/pages/agent'
import { ensureGL, prefersReducedMotion, webglAvailable } from '../charts/gl'
import {
  buildCapabilityProfile,
  buildEvolution3D,
  buildEvolutionRadar,
  buildEvolutionSankey,
  paramLabel,
  priorityOf,
  type Priority,
} from '../charts/evolutionCharts'
import { painColor } from '../charts/theme'
import { AIInsight, ChartCard } from '../components/ChartCard'
import { deriveGates, type AgentGateStats } from '../components/AgentRunDrawer'
import { EvidenceBadge, EvidenceDrawer } from '../components/EvidenceDrawer'
import { ProductVisual, productImageUrl } from '../components/ProductVisual'
import { ErrorCard, ScoreBar, SkeletonBlock } from '../components/ui'

/* ---------------- derived helpers (transparent, tooltip-documented) ---------------- */

const PRIORITY_STYLE: Record<Priority, string> = {
  P0: 'border-red/40 bg-red/10 text-red',
  P1: 'border-orange/40 bg-orange/10 text-orange',
  P2: 'border-line bg-base2 text-muted',
}

/* ---------------- human-in-the-loop decision status ---------------- */

type Decision = 'auto' | 'confirm' | 'engineering'

function decisionOf(param: ParameterUpgrade): Decision {
  if (param.confidence >= 0.8 && param.evidence_ids.length >= 3) return 'auto'
  if (param.confidence >= 0.6) return 'confirm'
  return 'engineering'
}

const DS_STYLE: Record<Decision, string> = {
  auto: 'border-success/40 bg-success/10 text-success',
  confirm: 'border-orange/40 bg-orange/10 text-orange',
  engineering: 'border-line2 bg-base2 text-muted',
}

/* ---------------- Agent decision panel ---------------- */

function AgentDecisionPanel({
  topPainLabel,
  topPainEvidence,
  confidence,
  onShowBasis,
}: {
  topPainLabel: string
  topPainEvidence: number
  /** confidence of the highest-confidence parameter addressing the top pain */
  confidence: number
  onShowBasis: () => void
}) {
  const { t } = useI18n()
  const confLevel = confidence >= 0.8 ? 'HIGH' : confidence >= 0.6 ? 'MEDIUM' : 'LOW'
  const confStyle =
    confLevel === 'HIGH' ? 'text-success' : confLevel === 'MEDIUM' ? 'text-orange' : 'text-muted'
  return (
    <section className="flex h-full flex-col rounded-2xl border border-violet/30 bg-gradient-to-br from-violet/[0.06] via-card to-primary/[0.05] p-5 shadow-card">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet/15 text-violet">
          <Bot className="h-4 w-4" />
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-ink">{t('agent.decision.title')}</h3>
      </div>
      <dl className="mt-4 flex-1 space-y-2.5 text-[12px]">
        <div className="flex items-start justify-between gap-3">
          <dt className="flex shrink-0 items-center gap-1.5 text-muted">
            <Target className="h-3.5 w-3.5 text-faint" />
            {t('agent.decision.goal')}
          </dt>
          <dd className="text-right font-medium text-ink">{t('agent.decision.goalVal')}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-muted">{t('agent.decision.topPain')}</dt>
          <dd className="text-right font-semibold text-ink">{topPainLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-muted">{t('agent.decision.evidence')}</dt>
          <dd className="tnum text-right font-medium text-ink">
            {t('agent.decision.evidenceVal', { n: topPainEvidence.toLocaleString() })}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="shrink-0 text-muted">{t('agent.decision.confidence')}</dt>
          <dd className={`text-right text-[12px] font-bold tracking-wide ${confStyle}`}>{confLevel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="flex shrink-0 items-center gap-1.5 text-muted">
            <Wrench className="h-3.5 w-3.5 text-faint" />
            {t('agent.decision.action')}
          </dt>
          <dd className="text-right font-medium text-primary">{t('agent.decision.actionVal')}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onShowBasis}
        className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary transition hover:bg-primary hover:text-white"
      >
        {t('agent.decision.viewBasis')}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </section>
  )
}

/* ---------------- evidence gate chain (suggestion → gates → V2) ---------------- */

function GateChain({ gates }: { gates: AgentGateStats }) {
  const { t } = useI18n()
  const steps = [
    {
      icon: <Wrench className="h-4 w-4" />,
      color: '#4F7CFF',
      title: t('agent.gate.suggestions'),
      lines: [t('agent.gate.suggestionsN', { n: gates.total })],
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      color: '#19B5D1',
      title: t('agent.gate.evidenceGate'),
      lines: [t('agent.gate.evidenceOk', { n: gates.evidenceOk })],
    },
    {
      icon: <ShieldCheck className="h-4 w-4" />,
      color: '#24B47E',
      title: t('agent.gate.confidenceGate'),
      lines: [
        t('agent.gate.highConf', { n: gates.highConf }),
        gates.needConfirm + gates.needEngineering > 0
          ? t('agent.gate.needHuman', { n: gates.needConfirm + gates.needEngineering })
          : null,
      ].filter(Boolean) as string[],
    },
    {
      icon: <Bot className="h-4 w-4" />,
      color: '#7C5CFC',
      title: t('agent.gate.v2'),
      lines: [`Product V2 · ${gates.total} Params`],
    },
  ]
  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
      <h3 className="text-sm font-semibold tracking-tight text-ink">{t('agent.gate.title')}</h3>
      <p className="mt-0.5 text-xs text-muted">{t('agent.gate.sub')}</p>
      <div className="mt-4 grid grid-cols-1 items-stretch gap-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr]">
        {steps.map((s, i) => (
          <div key={s.title} className="contents">
            {i > 0 && (
              <div className="hidden items-center justify-center sm:flex" aria-hidden>
                <svg className="h-4 w-4 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
                </svg>
              </div>
            )}
            <div
              className="flex flex-col justify-between gap-1.5 rounded-xl border p-3"
              style={{ borderColor: `${s.color}55`, background: `${s.color}0D` }}
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: s.color }}>
                {s.icon}
                {s.title}
              </p>
              {s.lines.map((l, j) => (
                <p key={j} className="tnum text-[12px] font-semibold text-ink">
                  {l}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ---------------- evolution bridge (V1 → evidence → V2) ---------------- */

function EvolutionBridge({ evidenceCount }: { evidenceCount: number }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-2 py-4 lg:py-0">
      {/* progressive arrows */}
      <div className="flex flex-col items-center gap-1.5">
        <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
        </svg>
        <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
          {t('evo.evidenceReviews', { n: evidenceCount.toLocaleString() })}
        </span>
        <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6l6 6-6 6" />
        </svg>
      </div>
      {/* subtle particle drift */}
      <div className="relative mt-1 h-6 w-40 overflow-hidden">
        <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary/10 via-accent/40 to-primary/10" />
        <span className="bridge-dot absolute left-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary" style={{ ['--drift-dist' as string]: '150px' }} />
        <span className="bridge-dot absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-accent" style={{ ['--drift-dist' as string]: '150px', animationDelay: '0.9s' }} />
        <span className="bridge-dot absolute left-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full bg-cyan" style={{ ['--drift-dist' as string]: '150px', animationDelay: '1.8s' }} />
      </div>
    </div>
  )
}

/* ---------------- before / after reveal slider ---------------- */

function BeforeAfterSlider({
  category,
  title,
  imageUrl,
  improvements,
}: {
  category: string
  title: string
  imageUrl?: string
  /** short improvement labels derived from real parameters */
  improvements: string[]
}) {
  const [pos, setPos] = useState(52)
  const { t } = useI18n()

  return (
    <div>
      <div className="relative h-[320px] overflow-hidden rounded-xl border border-line bg-base2 sm:h-[360px]">
        {/* base layer: V1 */}
        <div className="absolute inset-0">
          <div className="absolute left-4 top-4 z-10 rounded-lg border border-line bg-card/90 px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{t('evo.currentProductV1')}</p>
          </div>
          <div className="flex h-full items-center justify-center">
            <ProductVisual category={category} title={title} imageUrl={imageUrl} className="h-64 w-52 sm:h-72 sm:w-56" float={false} />
          </div>
        </div>

        {/* revealed layer: V2 with parameter labels */}
        <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.08]" />
          <div className="absolute right-4 top-4 z-10 rounded-lg border border-primary/50 bg-primary px-3 py-1.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">{t('evo.evolvedProductV2')}</p>
          </div>
          <div className="flex h-full items-center justify-center">
            <div className="relative">
              <ProductVisual category={category} title={title} imageUrl={imageUrl} className="h-64 w-52 sm:h-72 sm:w-56" float={false} />
              {/* parameter node labels */}
              <div className="absolute left-full top-1/2 hidden w-max -translate-y-1/2 space-y-2 pl-3 sm:block">
                {improvements.slice(0, 4).map((imp, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-primary/40 bg-card/95 px-2.5 py-1.5 shadow-sm"
                    style={{ marginLeft: `${i * 10}px` }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="text-[11px] font-medium text-ink">{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* divider + handle */}
        <div className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${pos}%` }}>
          <div className="h-full w-0.5 bg-primary/80" />
          <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-primary bg-white shadow-pop">
            <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l-4 6 4 6M15 6l4 6-4 6" />
            </svg>
          </div>
        </div>

        <input
          type="range"
          min={4}
          max={96}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
          aria-label={t('evo.sliderAria')}
        />
      </div>
      <p className="mt-2.5 text-center text-[11px] text-faint">{t('evo.sliderNote')}</p>
    </div>
  )
}

/* ---------------- parameter drawer detail block ---------------- */

function ParamDetail({
  param,
  painScore,
  painDisplay,
}: {
  param: ParameterUpgrade
  painScore?: number
  /** localized pain point label for param.pain_point */
  painDisplay?: string
}) {
  const { t } = useI18n()
  return (
    <div className="space-y-3 rounded-xl border border-line bg-base2 p-4 text-[12px]">
      <p className="flex items-start gap-2">
        <span className="w-20 shrink-0 text-muted">{t('evo.field.parameter')}</span>
        <span className="font-mono text-[11px] font-medium text-ink">{paramLabel(param.parameter)}</span>
      </p>
      <p className="flex items-start gap-2">
        <span className="w-20 shrink-0 text-muted">{t('evo.field.problem')}</span>
        <span className="leading-relaxed text-ink">{param.current_state}</span>
      </p>
      <p className="flex items-start gap-2">
        <span className="w-20 shrink-0 text-muted">{t('evo.field.proposed')}</span>
        <span className="leading-relaxed font-medium text-primary">{param.recommended_state}</span>
      </p>
      <p className="flex items-start gap-2">
        <span className="w-20 shrink-0 text-muted">{t('evo.field.reason')}</span>
        <span className="leading-relaxed text-muted">{param.reason}</span>
      </p>
      <div className="flex items-center justify-between border-t border-line pt-2.5">
        <span className="text-muted">{t('evo.field.confidence')}</span>
        <span className="flex w-32 items-center gap-2">
          <ScoreBar value={param.confidence * 100} className="flex-1" />
          <span className="tnum text-xs font-semibold text-ink">{(param.confidence * 100).toFixed(0)}%</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted">{t('evo.field.affectedPain')}</span>
        <span className="inline-flex items-center gap-1.5 font-medium text-ink">
          <span className="h-2 w-2 rounded-full" style={{ background: painColor(param.pain_point) }} />
          {painDisplay ?? param.pain_point}
          {painScore !== undefined && (
            <span className="tnum text-faint">· {t('evo.scoreInline', { v: painScore.toFixed(0) })}</span>
          )}
        </span>
      </div>
      <p className="text-[10px] leading-relaxed text-faint">{t('evo.paramNote')}</p>
    </div>
  )
}

/* ---------------- main page ---------------- */

type SortKey = 'priority' | 'confidence' | 'evidence' | 'parameter'

export function Evolution() {
  const { analysis, loading, error, reload } = useAnalysis()
  const { t, lang } = useI18n()
  const [searchParams] = useSearchParams()
  const painParam = searchParams.get('pain')

  const [drawerParam, setDrawerParam] = useState<ParameterUpgrade | null>(null)
  const [matrixView, setMatrixView] = useState<'radar' | '3d'>('radar')
  const [glReady, setGlReady] = useState<boolean | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('priority')
  const [painFilter, setPainFilter] = useState<string>('any')
  const [paramQuery, setParamQuery] = useState('')

  /* lazy GL for the 3D matrix */
  useEffect(() => {
    if (matrixView !== '3d') return
    if (!webglAvailable() || prefersReducedMotion()) {
      setGlReady(false)
      return
    }
    ensureGL().then((ok) => setGlReady(ok))
  }, [matrixView])

  /* resolve default pain filter from URL (?pain=) */
  useEffect(() => {
    if (painParam && painParam !== 'any') setPainFilter(painParam)
  }, [painParam])

  const painByName = useMemo(() => {
    const m = new Map<string, { score: number; id: string }>()
    if (analysis) {
      for (const p of analysis.pain_points) m.set(p.name, { score: p.pain_score, id: p.pain_point_id })
    }
    return m
  }, [analysis])

  /* localized pain point name (display_name in zh, key in en) */
  const painLabelByName = useMemo(() => {
    const m = new Map<string, string>()
    if (analysis) {
      for (const p of analysis.pain_points) m.set(p.name, painLabel(p))
    }
    return m
  }, [analysis, lang])

  const drawerPainPoint = useMemo(() => {
    if (!analysis || !drawerParam) return undefined
    return analysis.pain_points.find((p) => p.name === drawerParam.pain_point)
  }, [analysis, drawerParam])

  /* ------- sankey pain-node drawer ------- */
  const [painDrawerId, setPainDrawerId] = useState<string | null>(null)
  const painDrawerPoint = useMemo(
    () => analysis?.pain_points.find((p) => p.pain_point_id === painDrawerId) ?? null,
    [analysis, painDrawerId]
  )

  /* ------- sankey ------- */
  const sankey = useMemo(() => (analysis ? buildEvolutionSankey(analysis) : null), [analysis, lang])
  const [sankeyCont] = useChart(sankey?.option ?? null, (info) => {
    /* pain nodes open the evidence drawer */
    const name = info.name ?? ''
    if (sankey && sankey.handles.painNames.includes(name)) {
      const pp = analysis?.pain_points.find((p) => p.display_name === name || p.name === name)
      if (pp) setPainDrawerId(pp.pain_point_id)
    }
  })

  /* ------- capability matrix (radar + 3D) — derived live from real pain points ------- */
  const capability = useMemo(() => (analysis ? buildCapabilityProfile(analysis) : null), [analysis, lang])
  const matrixOption = useMemo<EChartsOption | null>(() => {
    if (!capability) return null
    if (matrixView === '3d' && glReady === true) return buildEvolution3D(capability)
    return buildEvolutionRadar(capability)
  }, [capability, matrixView, glReady, lang])

  /* re-init the chart whenever the renderer mode (2D/3D) actually flips */
  const matrixMode = matrixView === '3d' && glReady === true ? '3d' : '2d'
  const [matrixCont, matrixChart] = useChart(matrixOption, undefined, matrixMode)

  /* ------- parameter table rows (derived priority/status) ------- */
  const rows = useMemo(() => {
    if (!analysis) return []
    return analysis.product_v2.parameters.map((p) => {
      const painInfo = painByName.get(p.pain_point)
      const priority = priorityOf(p, painInfo?.score ?? 0)
      return {
        param: p,
        painScore: painInfo?.score,
        painId: painInfo?.id,
        priority,
        sortScore: (painInfo?.score ?? 0) * p.confidence,
      }
    })
  }, [analysis, painByName])

  const painOptions = useMemo(() => {
    const s = new Set<string>()
    rows.forEach((r) => s.add(r.param.pain_point))
    return [...s].sort()
  }, [rows])

  const visibleRows = useMemo(() => {
    let list = rows
    if (painFilter !== 'any') list = list.filter((r) => r.param.pain_point === painFilter)
    if (paramQuery.trim()) {
      const q = paramQuery.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.param.parameter.toLowerCase().includes(q) ||
          r.param.current_state.toLowerCase().includes(q) ||
          r.param.recommended_state.toLowerCase().includes(q) ||
          r.param.pain_point.toLowerCase().includes(q)
      )
    }
    const sorted = [...list]
    switch (sortKey) {
      case 'confidence':
        sorted.sort((a, b) => b.param.confidence - a.param.confidence)
        break
      case 'evidence':
        sorted.sort((a, b) => b.param.evidence_ids.length - a.param.evidence_ids.length)
        break
      case 'parameter':
        sorted.sort((a, b) => a.param.parameter.localeCompare(b.param.parameter))
        break
      default:
        sorted.sort((a, b) => b.sortScore - a.sortScore)
    }
    return sorted
  }, [rows, painFilter, paramQuery, sortKey])

  const evidenceTotal = useMemo(
    () => rows.reduce((s, r) => s + r.param.evidence_ids.length, 0),
    [rows]
  )

  /* ------- agent showcase: gates + top-pain decision ------- */
  const gates = useMemo(() => (analysis ? deriveGates(analysis) : null), [analysis])
  const topPain = useMemo(
    () => (analysis ? [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score)[0] : undefined),
    [analysis]
  )
  const topPainDecision = useMemo(() => {
    if (!analysis || !topPain) return null
    const params = analysis.product_v2.parameters.filter((p) => p.pain_point === topPain.name)
    const best = params.reduce<ParameterUpgrade | null>((acc, p) => (!acc || p.confidence > acc.confidence ? p : acc), null)
    return { evidence: topPain.evidence_review_ids.length, confidence: best?.confidence ?? 0 }
  }, [analysis, topPain])

  const insight = useMemo(() => {
    if (!analysis || rows.length === 0) return ''
    const p0 = rows.filter((r) => r.priority === 'P0').length
    const pains = new Set(rows.map((r) => r.param.pain_point)).size
    return t('evo.insight', { count: rows.length, pains, p0 })
  }, [analysis, rows, t, lang])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-[420px]" />
        <SkeletonBlock className="h-80" />
      </div>
    )
  }

  if (error || !analysis) {
    return <ErrorCard title={t('evo.errorTitle')} message={error ?? t('evo.noData')} onRetry={reload} />
  }

  const { product_v2: pv2, root_causes: rcs } = analysis
  const matrix3dOn = matrixView === '3d' && glReady === true
  const improvements = rows.slice(0, 4).map((r) => `+ ${r.param.recommended_state.slice(0, 42)}`)
  const DS_LABEL: Record<Decision, { main: string; sub: string }> = {
    auto: { main: t('agent.ds.auto'), sub: t('agent.ds.autoSub') },
    confirm: { main: t('agent.ds.confirm'), sub: t('agent.ds.confirmSub') },
    engineering: { main: t('agent.ds.engineering'), sub: t('agent.ds.engineeringSub') },
  }

  return (
    <div className="space-y-4 fade-in">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">{t('evo.eyebrow')}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">
            {t('evo.headline', { neg: analysis.stats.negative_reviews.toLocaleString(), count: rows.length })}
          </h1>
          <p className="mt-1 text-sm text-muted">{t('evo.subtitle')}</p>
        </div>
        <Link
          to="/launch"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primarydeep"
        >
          {t('evo.launchAssets')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <AIInsight text={insight} tag={t('evo.insightTag')} />

      {/* V1 → evidence → V2 hero */}
      <section className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <div className="flex gap-5 rounded-2xl border border-line bg-card p-5 shadow-card">
          <ProductVisual
            category={analysis.category}
            title={analysis.product_title}
            imageUrl={productImageUrl(analysis.product_id)}
            className="h-40 w-32 shrink-0"
            float={false}
            label="V1"
          />
          <div className="min-w-0">
            <span className="rounded-md border border-line2 bg-cardhover px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {t('evo.currentProduct')}
            </span>
            <h2 className="mt-2 text-sm font-semibold tracking-tight text-ink">{t('evo.productV1')}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">{productLabel(analysis.product_title, analysis.product_title_zh)}</p>
            <ul className="mt-3 space-y-1.5">
              {pv2.parameters.slice(0, 3).map((p) => (
                <li key={p.parameter} className="flex items-start gap-2 text-[12px] text-muted">
                  <svg className="mt-1 h-3 w-3 shrink-0 text-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
                  </svg>
                  <span className="min-w-0">
                    <span className="font-mono text-[11px] text-muted/90">{paramLabel(p.parameter)}</span>
                    <span className="block truncate" title={p.current_state}>{p.current_state}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <EvolutionBridge evidenceCount={evidenceTotal} />

        <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/[0.07] via-card to-accent/[0.06] p-5 shadow-card">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md border border-primary/50 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t('evo.aiEvolved')}
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-ink">{t('evo.productV2')}</h2>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{pv2.positioning}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {pv2.selling_points.slice(0, 4).map((sp, i) => (
              <span
                key={i}
                className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {sp}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* agent decision + gate chain */}
      {gates && topPain && topPainDecision && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <AgentDecisionPanel
            topPainLabel={painLabelByName.get(topPain.name) ?? topPain.name}
            topPainEvidence={topPainDecision.evidence}
            confidence={topPainDecision.confidence}
            onShowBasis={() => setPainDrawerId(topPain.pain_point_id)}
          />
          <GateChain gates={gates} />
        </div>
      )}

      {/* sankey + capability matrix */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ChartCard
          title={t('evo.sankeyTitle')}
          description={t('evo.sankeyDesc')}
          provenance={{ source: analysis.data_source, reviews: analysis.stats.total_reviews, generatedAt: analysis.generated_at }}
          className="min-h-[430px]"
        >
          {sankey ? (
            <div ref={sankeyCont} className="h-[460px]" />
          ) : (
            <SkeletonBlock className="h-[460px]" />
          )}
        </ChartCard>

        <ChartCard
          title={t('evo.matrixTitle')}
          description={matrix3dOn ? t('evo.matrixDesc3d') : t('evo.matrixDesc2d')}
          provenance={{ source: analysis.data_source, reviews: analysis.stats.total_reviews, extra: t('evo.matrixProvExtra') }}
          controls={
            <div className="flex items-center gap-2">
              <div className="seg" role="tablist" aria-label={t('evo.matrixViewAria')}>
                <button type="button" data-active={matrixView === 'radar'} onClick={() => setMatrixView('radar')}>
                  {t('evo.matrix2d')}
                </button>
                <button
                  type="button"
                  data-active={matrixView === '3d'}
                  onClick={() => setMatrixView('3d')}
                  disabled={glReady === false}
                  title={glReady === false ? t('evo.matrix3dUnavailable') : t('evo.matrix3dTooltip')}
                >
                  {t('evo.matrix3d')}
                </button>
              </div>
              {matrix3dOn && (
                <button
                  type="button"
                  onClick={() => {
                    const c = matrixChart.current
                    if (c) c.setOption({ grid3D: { viewControl: { alpha: 20, beta: 32, distance: 235 } } } as EChartsOption)
                  }}
                  className="rounded-lg border border-line bg-card px-2 py-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
                >
                  {t('evo.reset')}
                </button>
              )}
            </div>
          }
          className="min-h-[430px]"
        >
          <div ref={matrixCont} className="h-[460px]" />
        </ChartCard>
      </div>

      {/* before / after slider + root causes */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ChartCard
          title={t('evo.baTitle')}
          description={t('evo.baDesc')}
          provenance={{ source: analysis.data_source, reviews: analysis.stats.total_reviews }}
        >
          <BeforeAfterSlider
            category={analysis.category}
            title={analysis.product_title}
            imageUrl={productImageUrl(analysis.product_id)}
            improvements={improvements}
          />
        </ChartCard>

        <ChartCard
          title={t('evo.rcaTitle')}
          description={t('evo.rcaDesc', { n: Object.keys(rcs).length })}
          provenance={{ source: analysis.data_source, reviews: analysis.stats.total_reviews }}
        >
          <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {Object.entries(rcs).map(([name, rc]) => (
              <li key={name} className="rounded-xl border border-line bg-base2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <span className="h-2 w-2 rounded-full" style={{ background: painColor(name) }} />
                    {painLabelByName.get(name) ?? name}
                  </h4>
                  <span className="tnum text-[11px] text-muted">{t('evo.severity', { v: (rc.severity * 100).toFixed(0) })}</span>
                </div>
                <ScoreBar value={rc.severity * 100} className="mt-2" />
                <p className="mt-3 text-[13px] leading-relaxed text-muted">{rc.root_cause}</p>
                <div className="mt-2 grid grid-cols-1 gap-2 text-[12px] text-muted sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-primary">{t('evo.scenario')}</span>
                    {rc.affected_scenario}
                  </p>
                  <p>
                    <span className="font-medium text-cyan">{t('evo.users')}</span>
                    {rc.affected_users}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>

      {/* parameter table */}
      <section className="rounded-2xl border border-line bg-card shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 pb-3 pt-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink">{t('evo.tableTitle')}</h2>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
              {t('evo.tableSub')}
              <span title={t('evo.tableTooltip')}>
                <Info className="h-3 w-3 cursor-help text-faint" />
              </span>
              {t('evo.tableHint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={paramQuery}
                onChange={(e) => setParamQuery(e.target.value)}
                placeholder={t('evo.searchPlaceholder')}
                className="w-52 rounded-lg border border-line bg-base2 py-1.5 pl-8 pr-3 text-xs text-ink outline-none transition placeholder:text-faint focus:border-primary"
              />
            </label>
            <select
              value={painFilter}
              onChange={(e) => setPainFilter(e.target.value)}
              className="rounded-lg border border-line bg-base2 px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-primary"
              aria-label={t('evo.filterAria')}
            >
              <option value="any">{t('evo.allPains')}</option>
              {painOptions.map((p) => (
                <option key={p} value={p}>
                  {painLabelByName.get(p) ?? p}
                </option>
              ))}
            </select>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-lg border border-line bg-base2 px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-primary"
              aria-label={t('evo.sortAria')}
            >
              <option value="priority">{t('evo.sort.priority')}</option>
              <option value="confidence">{t('evo.sort.confidence')}</option>
              <option value="evidence">{t('evo.sort.evidence')}</option>
              <option value="parameter">{t('evo.sort.parameter')}</option>
            </select>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.12em] text-muted">
                <th className="px-5 py-2.5 font-semibold">{t('evo.col.priority')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.parameter')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.current')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.recommended')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.reason')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.confidence')}</th>
                <th className="px-4 py-2.5 font-semibold">{t('evo.col.evidence')}</th>
                <th className="px-5 py-2.5 font-semibold">{t('agent.ds.col')}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr
                  key={r.param.parameter}
                  onClick={() => setDrawerParam(r.param)}
                  className="cursor-pointer border-b border-line/60 align-top transition-colors last:border-0 hover:bg-tint/50"
                >
                  <td className="px-5 py-3.5">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${PRIORITY_STYLE[r.priority]}`}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs text-ink">{paramLabel(r.param.parameter)}</span>
                    <span
                      className="mt-1 inline-flex items-center gap-1.5 rounded border border-line bg-base2 px-1.5 py-0.5 text-[10px] text-muted"
                      title={t('evo.painScoreTitle', { v: r.painScore?.toFixed(0) ?? '—' })}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: painColor(r.param.pain_point) }} />
                      {painLabelByName.get(r.param.pain_point) ?? r.param.pain_point}
                    </span>
                  </td>
                  <td className="max-w-[170px] px-4 py-3.5 text-[12px] text-muted">{r.param.current_state}</td>
                  <td className="max-w-[210px] px-4 py-3.5 text-[12px] font-medium text-ink">{r.param.recommended_state}</td>
                  <td className="max-w-[240px] px-4 py-3.5">
                    <p className="line-clamp-3 text-[12px] leading-relaxed text-muted">{r.param.reason}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="w-20">
                      <span className="tnum text-xs font-semibold text-ink">{(r.param.confidence * 100).toFixed(0)}%</span>
                      <ScoreBar
                        value={r.param.confidence * 100}
                        color={r.param.confidence >= 0.8 ? '#24B47E' : r.param.confidence >= 0.6 ? '#FF9F43' : '#98A2B3'}
                        className="mt-1.5"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <EvidenceBadge
                      count={r.param.evidence_ids.length}
                      onClick={() => setDrawerParam(r.param)}
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex flex-col whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-semibold leading-tight ${DS_STYLE[decisionOf(r.param)]}`}>
                      <span>{DS_LABEL[decisionOf(r.param)].main}</span>
                      <span className="text-[9px] font-medium opacity-80">{DS_LABEL[decisionOf(r.param)].sub}</span>
                    </span>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted">
                    {t('evo.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* parameter evidence drawer */}
      <EvidenceDrawer
        open={drawerParam !== null}
        onClose={() => setDrawerParam(null)}
        painPoint={drawerPainPoint}
        title={drawerParam ? t('evo.drawerParamTitle', { name: paramLabel(drawerParam.parameter) }) : undefined}
        description={
          drawerParam
            ? t('evo.drawerParamDesc', { pain: painLabelByName.get(drawerParam.pain_point) ?? drawerParam.pain_point })
            : undefined
        }
        reviewIds={drawerParam?.evidence_ids}
        extraSection={
          drawerParam ? (
            <ParamDetail
              param={drawerParam}
              painScore={painByName.get(drawerParam.pain_point)?.score}
              painDisplay={painLabelByName.get(drawerParam.pain_point) ?? drawerParam.pain_point}
            />
          ) : undefined
        }
      />

      {/* sankey pain evidence drawer */}
      <EvidenceDrawer
        open={painDrawerId !== null && drawerParam === null}
        onClose={() => setPainDrawerId(null)}
        painPoint={painDrawerPoint ?? undefined}
      />
    </div>
  )
}
