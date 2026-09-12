import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Database,
  ExternalLink,
  Rocket,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react'
import { useAnalysis } from '../hooks/useAnalysis'
import { useUi } from '../context/UiContext'
import { painLabel, productLabel, useI18n } from '../i18n'
import '../i18n/pages/agent'
import { SkeletonBlock } from './ui'
import type { Analysis } from '../types'

/* ------------------------------------------------------------------ */
/* derivation — every number below comes from the real analysis result */
/* ------------------------------------------------------------------ */

export interface AgentGateStats {
  total: number
  evidenceOk: number
  highConf: number
  needConfirm: number
  needEngineering: number
  evidenceGatePass: boolean
  schemaPass: boolean
  confidenceGatePass: boolean
}

export function deriveGates(analysis: Analysis): AgentGateStats {
  const params = analysis.product_v2.parameters
  const evidenceOk = params.filter((p) => p.evidence_ids.length >= 3).length
  const highConf = params.filter((p) => p.confidence >= 0.8 && p.evidence_ids.length >= 3).length
  const needConfirm = params.filter((p) => p.confidence >= 0.6 && p.confidence < 0.8).length
  const needEngineering = params.filter((p) => p.confidence < 0.6).length
  const evidenceGatePass = analysis.pain_points.length > 0 && analysis.pain_points.every((p) => p.evidence_review_ids.length > 0)
  const schemaPass =
    params.length > 0 &&
    params.every(
      (p) =>
        typeof p.parameter === 'string' &&
        p.parameter.length > 0 &&
        typeof p.recommended_state === 'string' &&
        p.recommended_state.length > 0 &&
        Array.isArray(p.evidence_ids)
    )
  return {
    total: params.length,
    evidenceOk,
    highConf,
    needConfirm,
    needEngineering,
    evidenceGatePass,
    schemaPass,
    confidenceGatePass: needConfirm + needEngineering === 0,
  }
}

/* ------------------------------------------------------------------ */
/* small building blocks                                               */
/* ------------------------------------------------------------------ */

function PassBadge({ pass, warn }: { pass: boolean; warn?: string }) {
  const { t } = useI18n()
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${
        pass ? 'border-success/50 bg-success/10 text-success' : 'border-orange/50 bg-orange/10 text-orange'
      }`}
    >
      {pass ? <Check className="h-3 w-3" /> : <span aria-hidden>⚠</span>}
      {pass ? t('agent.s3.pass') : (warn ?? t('agent.s6.needHuman'))}
    </span>
  )
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-[11px] text-muted">{k}</span>
      <span className="tnum text-right text-[12px] font-medium text-ink">{v}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* architecture modal                                                  */
/* ------------------------------------------------------------------ */

function ArchitectureModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={t('agent.archTitle')}>
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Bot className="h-4 w-4 text-primary" />
            {t('agent.archTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line p-1.5 text-muted transition hover:border-primary hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 space-y-2.5 text-center text-[12px] font-medium">
          <div className="mx-auto w-fit rounded-lg border border-line bg-base2 px-4 py-2 text-ink">{t('agent.arch.userGoal')}</div>
          <div className="mx-auto h-4 w-px bg-line2" />
          <div className="mx-auto w-fit rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 font-semibold text-primary">
            {t('agent.arch.orchestrator')}
          </div>
          <div className="mx-auto h-4 w-px bg-line2" />
          <div className="mx-auto w-fit rounded-lg border border-cyan/50 bg-cyan/10 px-4 py-2 text-cyan">{t('agent.arch.sharedState')}</div>
          <div className="mx-auto h-4 w-px bg-line2" />
          <div className="grid grid-cols-3 gap-2">
            {[t('agent.arch.agent1'), t('agent.arch.agent2'), t('agent.arch.agent3')].map((a, i) => (
              <div key={i} className="rounded-lg border border-violet/40 bg-violet/10 px-2 py-2.5 text-ink" style={{ borderColor: 'rgba(124,92,252,.35)' }}>
                {a}
              </div>
            ))}
          </div>
          <div className="mx-auto h-4 w-px bg-line2" />
          <div className="mx-auto w-fit rounded-lg border border-line bg-base2 px-4 py-2 text-ink">{t('agent.arch.tools')}</div>
          <div className="mx-auto max-w-md rounded-lg border border-line bg-base px-3 py-2 font-mono text-[11px] leading-relaxed text-muted">
            {t('agent.arch.toolsList')}
          </div>
        </div>
        <p className="mt-4 border-t border-line pt-3 text-center text-[11px] leading-relaxed text-faint">{t('agent.arch.note')}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* one timeline step                                                   */
/* ------------------------------------------------------------------ */

interface StepProps {
  index: number
  icon: React.ReactNode
  color: string
  title: string
  desc: string
  badge?: React.ReactNode
  jumpTo?: string
  children?: React.ReactNode
}

function StepNode({ index, icon, color, title, desc, badge, jumpTo, children }: StepProps) {
  const { t } = useI18n()
  const { setAgentRunOpen } = useUi()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <li className="relative pl-12">
      {/* rail */}
      <span className="absolute left-[15px] top-9 h-[calc(100%-4px)] w-px bg-line" aria-hidden />
      <span
        className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg border text-white"
        style={{ background: color, borderColor: color }}
      >
        {icon}
      </span>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left" aria-expanded={open}>
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0">
            <span className="tnum mr-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">{t('agent.step')} {String(index).padStart(2, '0')}</span>
            <span className="text-[13px] font-semibold text-ink">{title}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {badge ?? (
              <span className="inline-flex items-center gap-1 rounded-md border border-success/50 bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                <Check className="h-3 w-3" />
                {t('agent.completed')}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 text-faint transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </span>
        <span className="mt-1 block text-[12px] leading-relaxed text-muted">{desc}</span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-2 rounded-xl border border-line bg-base2 p-3 fade-in">
          {children}
          {jumpTo && (
            <button
              type="button"
              onClick={() => {
                setAgentRunOpen(false)
                navigate(jumpTo)
              }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary transition hover:text-primarydeep"
            >
              <ExternalLink className="h-3 w-3" />
              {t('agent.jumpTo')}
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function ToolRow({ tools, output }: { tools: string; output?: string }) {
  const { t } = useI18n()
  return (
    <div className="space-y-1.5 text-[11px]">
      <p className="flex items-center gap-2">
        <span className="w-14 shrink-0 text-faint">{t('agent.tool')}</span>
        <span className="font-mono font-medium text-primary">{tools}</span>
      </p>
      {output && (
        <p className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-faint">{t('agent.output')}</span>
          <span className="text-ink">{output}</span>
        </p>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* flow summary (presentation-friendly)                                */
/* ------------------------------------------------------------------ */

function FlowSummary({ analysis, gates }: { analysis: Analysis; gates: AgentGateStats }) {
  const { t } = useI18n()
  const steps: { en: string; zh: string; val: string; color: string }[] = [
    { en: 'INPUT', zh: t('agent.flow.input'), val: `${analysis.stats.total_reviews.toLocaleString()} Reviews`, color: '#4F7CFF' },
    { en: 'OBSERVE', zh: t('agent.flow.observe'), val: `${analysis.stats.negative_reviews.toLocaleString()} ${t('agent.state.negative')}`, color: '#19B5D1' },
    { en: 'ANALYZE', zh: t('agent.flow.analyze'), val: `${analysis.pain_points.length} Pain Points`, color: '#7C5CFC' },
    { en: 'VERIFY', zh: t('agent.flow.verify'), val: gates.evidenceGatePass ? t('agent.flow.gatePass') : t('agent.s6.needHuman'), color: '#24B47E' },
    { en: 'REASON', zh: t('agent.flow.reason'), val: `${Object.keys(analysis.root_causes).length} Root Causes`, color: '#FF9F43' },
    { en: 'BUILD', zh: t('agent.flow.build'), val: `${gates.total}+ ${t('agent.state.params')}`, color: '#4F7CFF' },
    { en: 'OUTPUT', zh: t('agent.flow.output'), val: 'Product V2', color: '#7C5CFC' },
  ]
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 py-2">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.24em] text-faint">{t('agent.flow.title')}</p>
      {steps.map((s, i) => (
        <div key={s.en} className="flex flex-col items-center">
          {i > 0 && <span className="h-3 w-px bg-line2" aria-hidden />}
          <div
            className="flex w-full max-w-xl items-center justify-between gap-4 rounded-xl border px-5 py-3"
            style={{ borderColor: `${s.color}55`, background: `${s.color}0D` }}
          >
            <span className="flex items-baseline gap-3">
              <span className="text-[13px] font-bold tracking-[0.14em]" style={{ color: s.color }}>{s.en}</span>
              <span className="text-[12px] font-medium text-ink">{s.zh}</span>
            </span>
            <span className="tnum text-[13px] font-semibold text-ink">{s.val}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* the drawer                                                          */
/* ------------------------------------------------------------------ */

export function AgentRunDrawer() {
  const { agentRunOpen, setAgentRunOpen, presenting } = useUi()
  const { analysis, loading } = useAnalysis()
  const { t } = useI18n()
  const [archOpen, setArchOpen] = useState(false)
  const [stateOpen, setStateOpen] = useState(false)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [view, setView] = useState<'trace' | 'flow'>('trace')

  /* presentation mode defaults to the summary view */
  useEffect(() => {
    if (agentRunOpen && presenting) setView('flow')
  }, [agentRunOpen, presenting])

  /* esc closes */
  useEffect(() => {
    if (!agentRunOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAgentRunOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [agentRunOpen, setAgentRunOpen])

  const gates = useMemo(() => (analysis ? deriveGates(analysis) : null), [analysis])

  const derived = useMemo(() => {
    if (!analysis) return null
    const taskId = `R2P-${analysis.product_id.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase()}`
    const topPains = [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score)
    const topPain = topPains[0]
    const topRc = topPain ? analysis.root_causes[topPain.name] : undefined
    const evidenceUnique = new Set(analysis.pain_points.flatMap((p) => p.evidence_review_ids)).size
    const coveredPains = analysis.pain_points.filter((p) => p.evidence_review_ids.length > 0).length
    return { taskId, topPains, topPain, topRc, evidenceUnique, coveredPains }
  }, [analysis])

  if (!agentRunOpen) return null

  const width = presenting ? 'w-[min(1080px,86vw)]' : 'w-[min(500px,92vw)]'

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" onClick={() => setAgentRunOpen(false)} aria-hidden />
      <aside
        className={`fixed inset-y-0 right-0 z-[61] flex ${width} flex-col border-l border-line bg-card shadow-pop`}
        role="dialog"
        aria-modal="true"
        aria-label={t('agent.trace')}
      >
        {/* header */}
        <header className="border-b border-line px-5 pb-3.5 pt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Agent Run</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setArchOpen(true)}
                className="rounded-lg border border-line px-2 py-1 text-[11px] font-medium text-muted transition hover:border-primary hover:text-primary"
              >
                {t('agent.viewArch')}
              </button>
              <button
                type="button"
                onClick={() => setAgentRunOpen(false)}
                className="rounded-lg border border-line p-1.5 text-muted transition hover:border-primary hover:text-ink"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {loading || !analysis || !gates || !derived ? (
            <div className="mt-3 space-y-2">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-4 w-1/2" />
            </div>
          ) : (
            <div className="mt-2.5 space-y-1">
              <p className="tnum text-[12px] text-muted">
                {t('agent.taskId')} <span className="font-semibold text-ink">{derived.taskId}</span>
                <span className="mx-2 text-line2">·</span>
                {t('agent.currentProduct')}{' '}
                <span className="font-semibold text-ink">{productLabel(analysis.product_title, analysis.product_title_zh)}</span>
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-muted">
                {t('agent.status')}
                <span className="inline-flex items-center gap-1 font-semibold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  {t('agent.completed')}
                </span>
              </p>
            </div>
          )}
          {/* view toggle */}
          <div className="mt-3 flex items-center gap-2">
            <div className="seg" role="tablist" aria-label="Agent Run view">
              <button type="button" data-active={view === 'trace'} onClick={() => setView('trace')}>
                {t('agent.viewTrace')}
              </button>
              <button type="button" data-active={view === 'flow'} onClick={() => setView('flow')}>
                {t('agent.viewFlow')}
              </button>
            </div>
          </div>
        </header>

        {/* body */}
        {loading || !analysis || !gates || !derived ? (
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-16" />
            ))}
          </div>
        ) : view === 'flow' ? (
          <div className="flex-1 overflow-y-auto p-5">
            <FlowSummary analysis={analysis} gates={gates} />
          </div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {/* execution mode */}
            <section className="rounded-xl border border-line bg-base2 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t('agent.execMode')}</p>
              <div className="mt-2 space-y-1.5 text-[12px]">
                <p className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="font-semibold text-ink">{t('agent.agenticWorkflow')}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted">{t('agent.llm')}</span>
                  <span className={`font-semibold ${analysis.llm_mode === 'real' ? 'text-success' : 'text-orange'}`}>
                    {analysis.llm_mode === 'real' ? t('agent.llmReal') : t('agent.llmRule')}
                  </span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-muted">{t('agent.dataSource')}</span>
                  <span className="font-mono text-[11px] text-ink">{analysis.data_source}</span>
                </p>
              </div>
            </section>

            {/* trace timeline */}
            <section>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t('agent.trace')}</p>
              <ol className="space-y-5">
                <StepNode
                  index={1}
                  icon={<Database className="h-4 w-4" />}
                  color="#4F7CFF"
                  title={t('agent.s1.title')}
                  desc={t('agent.s1.desc', {
                    total: analysis.stats.total_reviews.toLocaleString(),
                    neg: analysis.stats.negative_reviews.toLocaleString(),
                  })}
                >
                  <ToolRow tools="DuckDB" output={`${analysis.stats.total_reviews.toLocaleString()} rows → ${analysis.stats.negative_reviews.toLocaleString()} negative`} />
                </StepNode>

                <StepNode
                  index={2}
                  icon={<Search className="h-4 w-4" />}
                  color="#19B5D1"
                  title={t('agent.s2.title')}
                  desc={t('agent.s2.desc', { n: analysis.pain_points.length })}
                  jumpTo="/galaxy"
                >
                  <ToolRow tools="TF-IDF · KMeans" output={`${analysis.stats.cluster_method} · K=${analysis.stats.n_clusters_raw}`} />
                  <div>
                    <p className="mb-1.5 text-[10px] text-faint">{t('agent.s2.top')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {derived.topPains.slice(0, 3).map((p) => (
                        <span key={p.pain_point_id} className="rounded-md border border-line bg-card px-2 py-1 text-[11px] font-medium text-ink">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </StepNode>

                <StepNode
                  index={3}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  color="#24B47E"
                  title={t('agent.s3.title')}
                  desc={t('agent.s3.desc')}
                  badge={
                    <span className="inline-flex items-center gap-1.5">
                      <span className="rounded-md border border-success/50 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                        {t('agent.s3.gate')} {t('agent.s3.pass')}
                      </span>
                    </span>
                  }
                  jumpTo="/evidence"
                >
                  <ToolRow tools="Evidence Retriever" output={`${t('agent.s3.supporting')}: ${derived.evidenceUnique.toLocaleString()}`} />
                  <div className="flex items-center justify-between rounded-lg border border-success/40 bg-success/10 px-3 py-2">
                    <span className="text-[11px] font-bold tracking-wide text-success">{t('agent.s3.gate')}</span>
                    <span className="text-[12px] font-bold text-success">{t('agent.s3.pass')}</span>
                  </div>
                </StepNode>

                <StepNode index={4} icon={<BrainCircuit className="h-4 w-4" />} color="#7C5CFC" title={t('agent.s4.title')} desc={t('agent.s4.desc')}>
                  <ToolRow tools={analysis.llm_mode === 'real' ? 'qwen3.8max / LLM' : 'Rule Engine'} />
                  {derived.topPain && (
                    <div className="rounded-lg border border-line bg-card p-2.5">
                      <p className="mb-1 text-[10px] text-faint">{t('agent.s4.top')}</p>
                      <p className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="font-semibold text-ink">{painLabel(derived.topPain)}</span>
                        <span className="text-line2">→</span>
                        <span className="font-medium text-primary">{derived.topRc?.root_cause ?? '—'}</span>
                      </p>
                    </div>
                  )}
                </StepNode>

                <StepNode
                  index={5}
                  icon={<Wrench className="h-4 w-4" />}
                  color="#FF9F43"
                  title={t('agent.s5.title')}
                  desc={t('agent.s5.desc', { n: gates.total })}
                  jumpTo="/evolution"
                >
                  <ToolRow tools={analysis.llm_mode === 'real' ? 'qwen3.8max / LLM' : 'Rule Engine'} output={`Product V2 · ${gates.total} parameters`} />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-success/40 bg-success/10 px-2 py-2">
                      <p className="tnum text-[16px] font-bold text-success">{gates.highConf}</p>
                      <p className="text-[10px] text-muted">{t('agent.s5.high')}</p>
                    </div>
                    <div className="rounded-lg border border-orange/40 bg-orange/10 px-2 py-2">
                      <p className="tnum text-[16px] font-bold text-orange">{gates.needConfirm}</p>
                      <p className="text-[10px] text-muted">{t('agent.s5.mid')}</p>
                    </div>
                    <div className="rounded-lg border border-line2 bg-base2 px-2 py-2">
                      <p className="tnum text-[16px] font-bold text-muted">{gates.needEngineering}</p>
                      <p className="text-[10px] text-muted">{t('agent.s5.eng')}</p>
                    </div>
                  </div>
                </StepNode>

                <StepNode
                  index={6}
                  icon={<ShieldCheck className="h-4 w-4" />}
                  color="#24B47E"
                  title={t('agent.s6.title')}
                  desc={gates.confidenceGatePass ? t('agent.s3.pass') : t('agent.s6.needHuman')}
                  badge={
                    gates.confidenceGatePass ? undefined : (
                      <span className="rounded-md border border-orange/50 bg-orange/10 px-2 py-0.5 text-[10px] font-bold text-orange">
                        {t('agent.s6.needHuman')}
                      </span>
                    )
                  }
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-ink">{t('agent.s6.evidenceGate')}</span>
                      <PassBadge pass={gates.evidenceGatePass} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-ink">{t('agent.s6.schema')}</span>
                      <PassBadge pass={gates.schemaPass} />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-line bg-card px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-ink">{t('agent.s6.confidence')}</span>
                      <PassBadge pass={gates.confidenceGatePass} />
                    </div>
                  </div>
                </StepNode>

                <StepNode
                  index={7}
                  icon={<Rocket className="h-4 w-4" />}
                  color="#4F7CFF"
                  title={t('agent.s7.title')}
                  desc={t('agent.s7.desc')}
                  jumpTo="/launch"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {['Product V2', `Selling Points ×${analysis.product_v2.selling_points.length}`, `Listing`, `FAQ ×${analysis.listing.faq.length}`].map(
                      (s) => (
                        <span key={s} className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                          {s}
                        </span>
                      )
                    )}
                  </div>
                </StepNode>
              </ol>
            </section>

            {/* agent state */}
            <section className="rounded-xl border border-line bg-base2">
              <button
                type="button"
                onClick={() => setStateOpen((v) => !v)}
                className="flex w-full items-center justify-between px-3.5 py-3"
                aria-expanded={stateOpen}
              >
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">{t('agent.state')}</span>
                <ChevronDown className={`h-4 w-4 text-faint transition-transform ${stateOpen ? 'rotate-180' : ''}`} />
              </button>
              {stateOpen && (
                <div className="border-t border-line px-3.5 py-3 fade-in">
                  <div className="divide-y divide-line/70">
                    <KV k={t('agent.state.stage')} v={t('agent.state.stageVal')} />
                    <KV k={t('agent.state.product')} v={analysis.product_id} />
                    <KV k={t('agent.state.reviews')} v={analysis.stats.total_reviews.toLocaleString()} />
                    <KV k={t('agent.state.negative')} v={analysis.stats.negative_reviews.toLocaleString()} />
                    <KV k={t('agent.state.pains')} v={String(analysis.pain_points.length)} />
                    <KV
                      k={t('agent.state.coverage')}
                      v={`${analysis.pain_points.length > 0 ? Math.round((derived.coveredPains / analysis.pain_points.length) * 100) : 0}%`}
                    />
                    <KV k={t('agent.state.params')} v={`${gates.total}+`} />
                    <KV k={t('agent.state.status')} v="Completed" />
                  </div>
                  <p className="mt-3 mb-1.5 text-[10px] text-faint">{t('agent.state.ctxTitle')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[t('agent.state.ctxTask'), t('agent.state.ctxProduct'), t('agent.state.ctxPain'), t('agent.state.ctxEvidence'), t('agent.state.ctxExec')].map(
                      (c) => (
                        <span key={c} className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1 text-[10px] font-medium text-cyan">
                          {c}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* adaptive routing */}
            <section className="rounded-xl border border-line bg-base2 p-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-faint">{t('agent.routing')}</p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink">
                <span className="rounded-md border border-success/40 bg-success/10 px-2 py-0.5 font-medium text-success">
                  {t('agent.routing.r1')}
                </span>
                <span className="text-faint">→</span>
                <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-medium text-primary">
                  {t('agent.routing.r2')}
                </span>
                <span className="text-faint">→</span>
                <span className="rounded-md border border-orange/40 bg-orange/10 px-2 py-0.5 font-medium text-orange">
                  {t('agent.routing.r3')}
                </span>
              </p>
              <p className="mt-1 text-[10px] text-faint">{t('agent.routing.cur')}</p>
              <button
                type="button"
                onClick={() => setRulesOpen((v) => !v)}
                className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary transition hover:text-primarydeep"
                aria-expanded={rulesOpen}
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${rulesOpen ? 'rotate-180' : ''}`} />
                {t('agent.rules')}
              </button>
              {rulesOpen && (
                <div className="mt-2 space-y-1.5 rounded-lg border border-line bg-card p-3 fade-in">
                  <p className="text-[10px] font-semibold text-muted">{t('agent.rules.title')}</p>
                  {[
                    [t('agent.rule.e1'), t('agent.rule.e1r')],
                    [t('agent.rule.e2'), t('agent.rule.e2r')],
                    [t('agent.rule.e3'), t('agent.rule.e3r')],
                    [t('agent.rule.e4'), t('agent.rule.e4r')],
                  ].map(([a, b], i) => (
                    <p key={i} className="flex items-center gap-2 text-[11px]">
                      <span className="w-[110px] shrink-0 font-medium text-ink">{a}</span>
                      <span className="text-faint">→</span>
                      <span className="text-muted">{b}</span>
                    </p>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </aside>
      {archOpen && <ArchitectureModal onClose={() => setArchOpen(false)} />}
    </>
  )
}
