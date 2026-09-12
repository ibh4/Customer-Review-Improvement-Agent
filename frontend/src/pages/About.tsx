import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Database,
  Filter,
  BrainCircuit,
  Workflow,
  MonitorPlay,
  ScanSearch,
  Orbit,
  FileSearch,
  GitBranch,
  Rocket,
  RefreshCw,
  Users,
  Target,
  Sparkles,
  ShieldCheck,
  Zap,
  Microscope,
  Wrench,
  PenTool,
  Layers,
  TrendingDown,
  Languages,
} from 'lucide-react'
import { PALETTE } from '../charts/theme'
import { useI18n } from '../i18n'
import '../i18n/pages/about'

/* high-contrast text tokens for the light theme */
const INK = '#172033'
const SUB = '#344054'
const ARROW = '#475467'
const GREEN_DARK = '#0E8A5F'

/* ---------------------------------------------------------------- */
/* 五层架构 SVG（自上而下流动，层间箭头）                             */
/* ---------------------------------------------------------------- */
function ArchitectureDiagram({ t }: { t: (k: string) => string }) {
  const layers = [
    {
      key: 'about.archL1',
      color: PALETTE.blue,
      nodes: [
        { t: 'about.archL1n1', s: 'about.archL1n1s' },
        { t: 'about.archL1n2', s: 'about.archL1n2s' },
      ],
    },
    {
      key: 'about.archL2',
      color: PALETTE.cyan,
      nodes: [
        { t: 'about.archL2n1', s: 'about.archL2n1s' },
        { t: 'about.archL2n2', s: 'about.archL2n2s' },
        { t: 'about.archL2n3', s: 'about.archL2n3s' },
      ],
    },
    {
      key: 'about.archL3',
      color: PALETTE.violet,
      nodes: [
        { t: 'about.archL3n1', s: 'about.archL3n1s' },
        { t: 'about.archL3n2', s: 'about.archL3n2s' },
        { t: 'about.archL3n3', s: 'about.archL3n3s' },
      ],
    },
    {
      key: 'about.archL4',
      color: PALETTE.orange,
      nodes: [
        { t: 'about.archL4n1', s: 'about.archL4n1s' },
        { t: 'about.archL4n2', s: 'about.archL4n2s' },
        { t: 'about.archL4n3', s: 'about.archL4n3s' },
        { t: 'about.archL4n4', s: 'about.archL4n4s' },
      ],
    },
  ]
  const l5Color = PALETTE.green

  /* geometry */
  const W = 1180
  const LBL = 118 // left layer-label column
  const PAD = 16
  const rowH = 86
  const gap = 44
  const bodyW = W - LBL - PAD * 2
  const topY = 14
  const L5H = 96

  const nodeXs = (n: number) => {
    const gapN = 12
    const w = (bodyW - gapN * (n - 1)) / n
    return Array.from({ length: n }, (_, i) => PAD + LBL + i * (w + gapN))
  }

  let y = topY
  const rows = layers.map((l) => {
    const row = { ...l, y }
    y += rowH + gap
    return row
  })
  const l5Y = y
  const H = l5Y + L5H + 14

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('about.archTitle')}>
      <defs>
        {[...layers.map((l) => l.color), l5Color].map((c, i) => (
          <linearGradient key={i} id={`ag-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop stopColor={c} stopOpacity="0.16" />
            <stop offset="1" stopColor={c} stopOpacity="0.04" />
          </linearGradient>
        ))}
        <marker id="ag-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L8,4.5 L0,9 z" fill={ARROW} />
        </marker>
      </defs>

      {/* rows L1-L4 */}
      {rows.map((row, ri) => {
        const xs = nodeXs(row.nodes.length)
        const nw = xs.length > 1 ? xs[1] - xs[0] - 12 : bodyW
        return (
          <g key={row.key}>
            {/* layer band */}
            <rect
              x={PAD}
              y={row.y}
              width={W - PAD * 2}
              height={rowH}
              rx="14"
              fill={`url(#ag-${ri})`}
              stroke={row.color}
              strokeOpacity="0.35"
            />
            {/* layer label */}
            <text x={PAD + LBL / 2} y={row.y + rowH / 2} textAnchor="middle" dominantBaseline="central">
              <tspan fill={row.color} fontSize="13" fontWeight="700">
                {`L${ri + 1}`}
              </tspan>
              <tspan fill={SUB} fontSize="12.5" fontWeight="600" x={PAD + LBL / 2} dy="18">
                {t(row.key)}
              </tspan>
            </text>
            {/* nodes */}
            {row.nodes.map((n, i) => (
              <g key={n.t}>
                <rect
                  x={xs[i]}
                  y={row.y + 12}
                  width={nw}
                  height={rowH - 24}
                  rx="10"
                  fill="#FFFFFF"
                  fillOpacity="0.9"
                  stroke={row.color}
                  strokeOpacity="0.55"
                />
                <text x={xs[i] + 14} y={row.y + rowH / 2 - 8} fill={INK} fontSize="13.5" fontWeight="600">
                  {t(n.t)}
                </text>
                <text x={xs[i] + 14} y={row.y + rowH / 2 + 13} fill={SUB} fontSize="11.5">
                  {t(n.s)}
                </text>
              </g>
            ))}
            {/* inter-layer arrow */}
            {ri < rows.length && row.y + rowH + gap <= l5Y && (
              <g>
                <line
                  x1={W / 2}
                  y1={row.y + rowH + 5}
                  x2={W / 2}
                  y2={row.y + rowH + gap - 6}
                  stroke={ARROW}
                  strokeWidth="1.6"
                  markerEnd="url(#ag-arrow)"
                  strokeDasharray="3 4"
                />
              </g>
            )}
          </g>
        )
      })}

      {/* L5 visualization layer */}
      <g>
        <rect
          x={PAD}
          y={l5Y}
          width={W - PAD * 2}
          height={L5H}
          rx="14"
          fill="url(#ag-4)"
          stroke={l5Color}
          strokeOpacity="0.4"
        />
        <text x={PAD + LBL / 2} y={l5Y + L5H / 2} textAnchor="middle" dominantBaseline="central">
          <tspan fill={l5Color} fontSize="13" fontWeight="700">
            L5
          </tspan>
          <tspan fill={SUB} fontSize="12.5" fontWeight="600" x={PAD + LBL / 2} dy="18">
            {t('about.archL5')}
          </tspan>
        </text>
        {/* five page chips */}
        {['nav.productMri', 'nav.painGalaxy', 'nav.evidence', 'nav.evolution', 'nav.launch'].map((k, i) => {
          const n = 5
          const gapN = 12
          const w = (bodyW - gapN * (n - 1)) / n
          const x = PAD + LBL + i * (w + gapN)
          return (
            <g key={k}>
              <rect x={x} y={l5Y + 22} width={w} height={L5H - 44} rx="9" fill={l5Color} fillOpacity="0.1" stroke={l5Color} strokeOpacity="0.5" />
              <text x={x + w / 2} y={l5Y + L5H / 2} textAnchor="middle" dominantBaseline="central" fill={INK} fontSize="12.5" fontWeight="600">
                {t(k)}
              </text>
            </g>
          )
        })}
        <text x={W / 2} y={l5Y + L5H - 8} textAnchor="middle" fill={ARROW} fontSize="11">
          {t('about.archL5s')}
        </text>
      </g>
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* 进化闭环流程图（横向六步 + 回环）                                  */
/* ---------------------------------------------------------------- */
function LoopDiagram({ t }: { t: (k: string) => string }) {
  const steps = [
    { t: 'about.loop1', s: 'about.loop1s', icon: Database, color: PALETTE.blue },
    { t: 'about.loop2', s: 'about.loop2s', icon: BrainCircuit, color: PALETTE.violet },
    { t: 'about.loop3', s: 'about.loop3s', icon: Filter, color: PALETTE.cyan },
    { t: 'about.loop4', s: 'about.loop4s', icon: Workflow, color: PALETTE.orange },
    { t: 'about.loop5', s: 'about.loop5s', icon: Rocket, color: PALETTE.pink },
    { t: 'about.loop6', s: 'about.loop6s', icon: RefreshCw, color: PALETTE.green },
  ]
  const W = 1180
  const cardW = 168
  const gap = (W - cardW * 6) / 5
  const H = 150

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('about.loopTitle')}>
      <defs>
        <marker id="lp-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L8,4.5 L0,9 z" fill={ARROW} />
        </marker>
      </defs>
      {steps.map((st, i) => {
        const x = i * (cardW + gap)
        const Icon = st.icon
        return (
          <g key={st.t}>
            <rect x={x} y={18} width={cardW} height={100} rx="12" fill={st.color} fillOpacity="0.07" stroke={st.color} strokeOpacity="0.45" />
            <g transform={`translate(${x + 14}, 30)`}>
              <Icon size={22} color={st.color} />
            </g>
            {wrapText(t(st.t), cardW - 56, 13, 1).map((ln) => (
              <text key={ln} x={x + 44} y={47} fill={INK} fontSize="13" fontWeight="600">
                {ln}
              </text>
            ))}
            {wrapText(t(st.s), cardW - 26, 11, 2).map((ln, li) => (
              <text key={li} x={x + 14} y={74 + li * 13.5} fill={SUB} fontSize="11">
                {ln}
              </text>
            ))}
            <text x={x + cardW - 16} y={36} textAnchor="end" fill={st.color} fillOpacity="0.85" fontSize="18" fontWeight="800">
              {`0${i + 1}`}
            </text>
            {i < steps.length - 1 && (
              <line
                x1={x + cardW + 4}
                y1={68}
                x2={x + cardW + gap - 5}
                y2={68}
                stroke={ARROW}
                strokeWidth="1.6"
                markerEnd="url(#lp-arrow)"
              />
            )}
          </g>
        )
      })}
      {/* loop-back path: from step6 bottom back to step1 bottom */}
      <path
        d={`M ${W - cardW / 2} 118 v 18 H ${cardW / 2} v -14`}
        fill="none"
        stroke={PALETTE.green}
        strokeOpacity="0.55"
        strokeWidth="1.6"
        strokeDasharray="5 4"
        markerEnd="url(#lp-arrow)"
      />
      <text x={W / 2} y={146} textAnchor="middle" fill={GREEN_DARK} fontSize="11.5" fontWeight="600">
        {t('about.loopCycle')}
      </text>
    </svg>
  )
}

/* CJK-aware text wrapping for SVG diagrams */
function wrapText(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const charW = (c: string) => (c.charCodeAt(0) > 0x2e80 ? fontSize : fontSize * 0.55)
  const lines: string[] = []
  let line = ''
  let w = 0
  for (const c of text) {
    const cw = charW(c)
    if (w + cw > maxWidth && line) {
      lines.push(line)
      line = ''
      w = 0
      if (lines.length >= maxLines) {
        const last = lines[maxLines - 1]
        lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 1)) + '…'
        return lines
      }
    }
    line += c
    w += cw
  }
  if (line && lines.length < maxLines) lines.push(line)
  return lines
}

/* ---------------------------------------------------------------- */
/* AI Agent 工作流（编排指挥 + 五个专职 Agent + LLM 可插拔层）        */
/* ---------------------------------------------------------------- */
function AgentWorkflowDiagram({ t }: { t: (k: string) => string }) {
  const agents = [
    { t: 'about.agent1', s: 'about.agent1s', io: 'about.agent1io', icon: Database, color: PALETTE.blue },
    { t: 'about.agent2', s: 'about.agent2s', io: 'about.agent2io', icon: BrainCircuit, color: PALETTE.cyan },
    { t: 'about.agent3', s: 'about.agent3s', io: 'about.agent3io', icon: Microscope, color: PALETTE.violet },
    { t: 'about.agent4', s: 'about.agent4s', io: 'about.agent4io', icon: Wrench, color: PALETTE.orange },
    { t: 'about.agent5', s: 'about.agent5s', io: 'about.agent5io', icon: PenTool, color: PALETTE.pink },
  ]
  const W = 1180
  const PAD = 14
  const cardGap = 14
  const cardW = (W - PAD * 2 - cardGap * 4) / 5
  const orchH = 44
  const dropH = 22
  const cardH = 150
  const llmY = PAD + orchH + dropH + cardH + 26
  const llmH = 58
  const H = llmY + llmH + PAD

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('about.agentTitle')}>
      <defs>
        <marker id="aw-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L8,4.5 L0,9 z" fill={ARROW} />
        </marker>
        <linearGradient id="aw-orch" x1="0" y1="0" x2="1" y2="0">
          <stop stopColor={PALETTE.indigo} stopOpacity="0.14" />
          <stop offset="1" stopColor={PALETTE.indigo} stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* orchestrator bar */}
      <rect x={PAD} y={PAD} width={W - PAD * 2} height={orchH} rx="11" fill="url(#aw-orch)" stroke={PALETTE.indigo} strokeOpacity="0.45" />
      <g transform={`translate(${PAD + 16}, ${PAD + 12})`}>
        <Workflow size={20} color={PALETTE.indigo} />
      </g>
      <text x={PAD + 46} y={PAD + 22} fill={INK} fontSize="13" fontWeight="700">
        {t('about.agent0')}
      </text>
      <text x={PAD + 46} y={PAD + 38} fill={SUB} fontSize="11">
        {t('about.agent0s')}
      </text>

      {/* drop lines + agent cards */}
      {agents.map((a, i) => {
        const x = PAD + i * (cardW + cardGap)
        const cx = x + cardW / 2
        const cardY = PAD + orchH + dropH
        const Icon = a.icon
        return (
          <g key={a.t}>
            <line x1={cx} y1={PAD + orchH + 2} x2={cx} y2={cardY - 2} stroke={PALETTE.indigo} strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 3" />
            <rect x={x} y={cardY} width={cardW} height={cardH} rx="12" fill="#FFFFFF" fillOpacity="0.92" stroke={a.color} strokeOpacity="0.5" />
            <g transform={`translate(${x + 13}, ${cardY + 13})`}>
              <Icon size={19} color={a.color} />
            </g>
            <text x={x + 39} y={cardY + 27} fill={INK} fontSize="12.5" fontWeight="700">
              {t(a.t)}
            </text>
            <text x={x + cardW - 12} y={cardY + 27} textAnchor="end" fill={a.color} fontSize="15" fontWeight="800" fillOpacity="0.8">
              {`A${i + 1}`}
            </text>
            {wrapText(t(a.s), cardW - 26, 10.2, 3).map((ln, li) => (
              <text key={li} x={x + 13} y={cardY + 50 + li * 14} fill={SUB} fontSize="10.2">
                {ln}
              </text>
            ))}
            {/* io chip */}
            <rect x={x + 11} y={cardY + cardH - 40} width={cardW - 22} height={28} rx="7" fill={a.color} fillOpacity="0.09" stroke={a.color} strokeOpacity="0.35" />
            {wrapText(t(a.io), cardW - 32, 9.8, 1).map((ln) => (
              <text key={ln} x={x + cardW / 2} y={cardY + cardH - 26} textAnchor="middle" dominantBaseline="central" fill={INK} fontSize="9.8" fontWeight="600">
                {ln}
              </text>
            ))}
            {/* pipeline arrow */}
            {i < agents.length - 1 && (
              <line x1={x + cardW + 2} y1={cardY + cardH / 2} x2={x + cardW + cardGap - 3} y2={cardY + cardH / 2} stroke={ARROW} strokeWidth="1.6" markerEnd="url(#aw-arrow)" />
            )}
          </g>
        )
      })}

      {/* pluggable LLM layer */}
      <rect x={PAD} y={llmY} width={W - PAD * 2} height={llmH} rx="11" fill={PALETTE.green} fillOpacity="0.07" stroke={PALETTE.green} strokeOpacity="0.4" strokeDasharray="6 4" />
      <text x={W / 2} y={llmY + 20} textAnchor="middle" dominantBaseline="central" fill={GREEN_DARK} fontSize="11.5" fontWeight="700">
        {t('about.agentLLM').split('：')[0]}
      </text>
      <text x={W / 2} y={llmY + 40} textAnchor="middle" dominantBaseline="central" fill={SUB} fontSize="10.5">
        {t('about.agentLLM').split('：').slice(1).join('：')}
      </text>
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* 数据处理管道（六阶段漏斗，数据量逐级收敛）                          */
/* ---------------------------------------------------------------- */
function PipelineDiagram({ t }: { t: (k: string) => string }) {
  const stages = [
    { t: 'about.pipe1', v: 'about.pipe1v', metric: '57.19M', color: PALETTE.blue },
    { t: 'about.pipe2', v: 'about.pipe2v', metric: '18,167', color: PALETTE.cyan },
    { t: 'about.pipe3', v: 'about.pipe3v', metric: '4,696', color: PALETTE.indigo },
    { t: 'about.pipe4', v: 'about.pipe4v', metric: 'K-Means', color: PALETTE.violet },
    { t: 'about.pipe5', v: 'about.pipe5v', metric: '21 types', color: PALETTE.orange },
    { t: 'about.pipe6', v: 'about.pipe6v', metric: '128 props', color: PALETTE.pink },
  ]
  const W = 1180
  const PAD = 14
  const gap = 18
  const cardW = (W - PAD * 2 - gap * 5) / 6
  const H = 168
  const cardY = 60
  const cardH = 92

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t('about.pipeTitle')}>
      <defs>
        <marker id="pp-arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
          <path d="M0,0 L8,4.5 L0,9 z" fill={ARROW} />
        </marker>
      </defs>

      {/* funnel scale rail */}
      <line x1={PAD + 8} y1={34} x2={W - PAD - 8} y2={34} stroke="#E9EDF5" strokeWidth="2" />
      {stages.map((st, i) => {
        const x = PAD + i * (cardW + gap)
        const cx = x + cardW / 2
        return (
          <g key={st.t}>
            {/* stage number + metric above the rail */}
            <text x={cx} y={16} textAnchor="middle" dominantBaseline="central" fill={ARROW} fontSize="10" fontWeight="700">
              {`STEP ${i + 1}`}
            </text>
            <text x={cx} y={38} textAnchor="middle" dominantBaseline="central" fill={st.color} fontSize="14.5" fontWeight="800">
              {st.metric}
            </text>
            {/* funnel tick */}
            <circle cx={cx} cy={34} r="3.4" fill={st.color} />
            {/* card */}
            <rect x={x} y={cardY} width={cardW} height={cardH} rx="11" fill="#FFFFFF" fillOpacity="0.92" stroke={st.color} strokeOpacity="0.5" />
            {wrapText(t(st.t), cardW - 24, 12.5, 1).map((ln) => (
              <text key={ln} x={x + 12} y={cardY + 24} fill={INK} fontSize="12.5" fontWeight="700">
                {ln}
              </text>
            ))}
            {wrapText(t(st.v), cardW - 24, 10.2, 3).map((ln, li) => (
              <text key={li} x={x + 12} y={cardY + 46 + li * 14} fill={SUB} fontSize="10.2">
                {ln}
              </text>
            ))}
            <line x1={cx} y1={44} x2={cx} y2={cardY - 2} stroke={st.color} strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="2 3" />
            {/* arrow */}
            {i < stages.length - 1 && (
              <line x1={x + cardW + 3} y1={cardY + cardH / 2} x2={x + cardW + gap - 4} y2={cardY + cardH / 2} stroke={ARROW} strokeWidth="1.6" markerEnd="url(#pp-arrow)" />
            )}
          </g>
        )
      })}
    </svg>
  )
}

/* ---------------------------------------------------------------- */
/* page                                                              */
/* ---------------------------------------------------------------- */
export function About() {
  const { t } = useI18n()

  const kpis = [
    { v: '18,167', label: 'about.kpiReviews', sub: 'about.kpiReviewsSub', color: PALETTE.blue },
    { v: '25', label: 'about.kpiProducts', sub: 'about.kpiProductsSub', color: '#2DD4BF' },
    { v: '4,696', label: 'about.kpiNegative', sub: 'about.kpiNegativeSub', color: '#F59E0B' },
    { v: '21', label: 'about.kpiPains', sub: 'about.kpiPainsSub', color: '#8B5CF6' },
    { v: '128', label: 'about.kpiParams', sub: 'about.kpiParamsSub', color: '#EC4899' },
  ]

  const tour = [
    { to: '/', icon: ScanSearch, title: 'about.tour1', sub: 'about.tour1s' },
    { to: '/galaxy', icon: Orbit, title: 'about.tour2', sub: 'about.tour2s' },
    { to: '/evidence', icon: FileSearch, title: 'about.tour3', sub: 'about.tour3s' },
    { to: '/evolution', icon: GitBranch, title: 'about.tour4', sub: 'about.tour4s' },
    { to: '/launch', icon: Rocket, title: 'about.tour5', sub: 'about.tour5s' },
  ]

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 lg:px-8">
      {/* hero */}
      <header className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          <MonitorPlay size={14} />
          <span>{t('nav.about')}</span>
        </div>
        <h1 className="max-w-4xl text-2xl font-bold leading-snug tracking-tight text-ink lg:text-[30px]">
          {t('about.title')}
        </h1>
        <p className="mt-2 text-sm text-[#344054] lg:text-[15px]">{t('about.subtitle')}</p>
      </header>

      {/* KPI band */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-line bg-card p-4">
            <p className="text-[26px] font-bold leading-none tracking-tight" style={{ color: k.color }}>
              {k.v}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-ink">{t(k.label)}</p>
            <p className="mt-0.5 text-[11px] text-[#344054]">{t(k.sub)}</p>
          </div>
        ))}
      </div>

      {/* mission */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <h2 className="mb-3 text-base font-semibold text-ink">{t('about.mission')}</h2>
        <p className="max-w-5xl text-[13.5px] leading-relaxed text-[#344054]">{t('about.missionBody')}</p>
      </section>

      {/* audience & business pains */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Users size={17} className="text-primary" />
            {t('about.audTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.audDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            { icon: Target, title: 'about.aud1', sub: 'about.aud1s', color: PALETTE.blue },
            { icon: Wrench, title: 'about.aud2', sub: 'about.aud2s', color: PALETTE.violet },
            { icon: Languages, title: 'about.aud3', sub: 'about.aud3s', color: PALETTE.pink },
          ].map((a) => {
            const Icon = a.icon
            return (
              <div key={a.title} className="rounded-xl border border-line bg-base p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} style={{ color: a.color }} />
                  <p className="text-[13px] font-semibold text-ink">{t(a.title)}</p>
                </div>
                <p className="text-[12px] leading-relaxed text-[#344054]">{t(a.sub)}</p>
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <TrendingDown size={18} className="shrink-0 text-primary" />
          <div>
            <p className="text-[12.5px] font-semibold text-ink">{t('about.audPain')}</p>
            <p className="text-[11.5px] text-[#344054]">{t('about.audPainV')}</p>
          </div>
        </div>
      </section>

      {/* core features */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Sparkles size={17} className="text-primary" />
            {t('about.featTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.featDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: ScanSearch, title: 'about.feat1', sub: 'about.feat1s', color: PALETTE.blue },
            { icon: Orbit, title: 'about.feat2', sub: 'about.feat2s', color: PALETTE.cyan },
            { icon: FileSearch, title: 'about.feat3', sub: 'about.feat3s', color: PALETTE.green },
            { icon: GitBranch, title: 'about.feat4', sub: 'about.feat4s', color: PALETTE.orange },
            { icon: Rocket, title: 'about.feat5', sub: 'about.feat5s', color: PALETTE.pink },
          ].map((f, i) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="rounded-xl border border-line bg-base p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Icon size={17} style={{ color: f.color }} />
                  <span className="text-[11px] font-bold" style={{ color: f.color }}>{`F${i + 1}`}</span>
                </div>
                <p className="text-[13px] font-semibold text-ink">{t(f.title)}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#475467]">{t(f.sub)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* AI agent workflow */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <BrainCircuit size={17} className="text-primary" />
            {t('about.agentTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.agentDesc')}</p>
        </div>
        <AgentWorkflowDiagram t={t} />
      </section>

      {/* architecture */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{t('about.archTitle')}</h2>
          <p className="text-xs text-[#475467]">{t('about.archDesc')}</p>
        </div>
        <ArchitectureDiagram t={t} />
      </section>

      {/* data pipeline */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Filter size={17} className="text-primary" />
            {t('about.pipeTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.pipeDesc')}</p>
        </div>
        <PipelineDiagram t={t} />
      </section>

      {/* loop */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{t('about.loopTitle')}</h2>
          <p className="text-xs text-[#475467]">{t('about.loopDesc')}</p>
        </div>
        <LoopDiagram t={t} />
      </section>

      {/* data source */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{t('about.dataTitle')}</h2>
          <p className="text-xs text-[#475467]">{t('about.dataDesc')}</p>
        </div>
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3">
          <Database size={20} className="shrink-0 text-success" />
          <div>
            <p className="text-sm font-semibold text-ink">{t('about.dataName')}</p>
            <p className="text-[11.5px] text-[#344054]">{t('about.dataNameSub')}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            ['about.dataScale', 'about.dataScaleV'],
            ['about.dataFields', 'about.dataFieldsV'],
            ['about.dataNeg', 'about.dataNegV'],
            ['about.dataLicense', 'about.dataLicenseV'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-line bg-base px-4 py-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#475467]">{t(k)}</p>
              <p className="text-[12.5px] leading-relaxed text-[#344054]">{t(v)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* tech components panorama */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Layers size={17} className="text-primary" />
            {t('about.compTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.compDesc')}</p>
        </div>
        <div className="space-y-2.5">
          {[
            { k: 'about.compFE', v: 'about.compFEV', icon: MonitorPlay, color: PALETTE.blue, layer: 'L5' },
            { k: 'about.compBE', v: 'about.compBEV', icon: Workflow, color: PALETTE.cyan, layer: 'L4' },
            { k: 'about.compLLM', v: 'about.compLLMV', icon: BrainCircuit, color: PALETTE.violet, layer: 'L3' },
            { k: 'about.compAlgo', v: 'about.compAlgoV', icon: Zap, color: PALETTE.orange, layer: 'L2' },
            { k: 'about.compData', v: 'about.compDataV', icon: Database, color: PALETTE.green, layer: 'L1' },
          ].map((row) => {
            const Icon = row.icon
            return (
              <div key={row.k} className="flex items-center gap-3 rounded-xl border border-line bg-base px-4 py-3">
                <span className="w-8 shrink-0 text-center text-[12px] font-extrabold" style={{ color: row.color }}>
                  {row.layer}
                </span>
                <Icon size={17} className="shrink-0" style={{ color: row.color }} />
                <p className="w-24 shrink-0 text-[12.5px] font-semibold text-ink lg:w-28">{t(row.k)}</p>
                <p className="text-[12px] leading-relaxed text-[#344054]">{t(row.v)}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* highlights & expected outcomes */}
      <section className="mb-8 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <ShieldCheck size={17} className="text-primary" />
            {t('about.hlTitle')}
          </h2>
          <p className="text-xs text-[#475467]">{t('about.hlDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { icon: FileSearch, title: 'about.hl1', sub: 'about.hl1s', color: PALETTE.blue },
            { icon: Sparkles, title: 'about.hl2', sub: 'about.hl2s', color: PALETTE.violet },
            { icon: Zap, title: 'about.hl3', sub: 'about.hl3s', color: PALETTE.green },
            { icon: TrendingDown, title: 'about.hl4', sub: 'about.hl4s', color: PALETTE.orange },
          ].map((h) => {
            const Icon = h.icon
            return (
              <div key={h.title} className="flex gap-3 rounded-xl border border-line bg-base p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: h.color + '1A' }}>
                  <Icon size={16} style={{ color: h.color }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-ink">{t(h.title)}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[#344054]">{t(h.sub)}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* page tour */}
      <section className="mb-4 rounded-2xl border border-line bg-card p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{t('about.tourTitle')}</h2>
          <p className="text-xs text-[#475467]">{t('about.tourDesc')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {tour.map((p) => {
            const Icon = p.icon
            return (
              <Link
                key={p.to}
                to={p.to}
                className="group rounded-xl border border-line bg-base p-4 transition hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Icon size={18} className="text-primary" />
                  <ArrowRight size={14} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <p className="text-[13px] font-semibold text-ink">{t(p.title)}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-[#475467]">{t(p.sub)}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}
