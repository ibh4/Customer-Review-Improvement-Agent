/**
 * Product Evolution chart builders.
 *
 * Sankey   — 4-level classification: pain → root-cause category → parameter → priority.
 *            Root causes are classified into engineering domains by transparent
 *            keyword rules (no LLM invention); full text stays available in tooltips.
 * Matrix   — capability dimensions derive LIVE from the product's real pain points
 *            (top 6 by pain score), so every product gets its own radar/3D shape:
 *              V1  = 100 − pain_score × 0.62          (worse pain → weaker V1)
 *              V2  = V1 + (97 − V1) × (0.55 + 0.40 × avg confidence)
 *            The 3D view adds a Δ (improvement) series the radar cannot show.
 */
import type { EChartsOption } from 'echarts'
import type { Analysis, ParameterUpgrade, PainPoint, RootCause } from '../types'
import { PALETTE, chartTheme, painColor, tooltipStyle } from './theme'
import { painLabel, tr } from '../i18n/core'

/* ------------------------------------------------------------------ */
/* Shared derivations (page table + sankey use the same rules)         */
/* ------------------------------------------------------------------ */

export type Priority = 'P0' | 'P1' | 'P2'

/** derived priority: pain score × confidence (P0 ≥ 45, P1 ≥ 25) */
export function priorityOf(param: ParameterUpgrade, painScore: number): Priority {
  const score = painScore * param.confidence
  if (score >= 45) return 'P0'
  if (score >= 25) return 'P1'
  return 'P2'
}

/**
 * snake_case parameter key → readable bilingual label via the dict catalog
 * (`evo.param.*`); unmapped dynamic names fall back to spaces.
 */
export function paramLabel(key: string): string {
  const dictKey = `evo.param.${key}`
  const v = tr(dictKey)
  if (v !== dictKey) return v
  /* fallback cluster params ("other:_hair_/_curly_review") are really
     "manual review of this keyword cluster" — label them as such */
  if (/^other:/i.test(key)) {
    const kw = key
      .replace(/^other:\s*/i, '')
      .replace(/_review$/i, '')
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    return `${tr('evo.param.manualReview')} · ${kw}`
  }
  return key.replace(/_/g, ' ')
}

/** wrap long bilingual labels ("A / B" → two lines) for radar / 3D axes */
const wrapLabel = (s: string) => s.split(' / ').join('\n')

/* ------------------------------------------------------------------ */
/* Capability profile — derived live from real pain points             */
/* ------------------------------------------------------------------ */

export interface CapabilityDim {
  /** stable english pain key */
  key: string
  /** localized capability label (= bilingual pain label) */
  label: string
  /** V1 weakness score, 0–100 */
  v1: number
  /** V2 target score, 0–100 */
  v2: number
  /** improvement delta */
  delta: number
  /** total evidence reviews behind linked parameter upgrades */
  evidence: number
  /** average confidence of linked parameter upgrades */
  confidence: number
  reviewCount: number
}

export interface CapabilityProfile {
  dims: CapabilityDim[]
}

export function buildCapabilityProfile(analysis: Analysis): CapabilityProfile {
  const paramsByPain = new Map<string, ParameterUpgrade[]>()
  for (const p of analysis.product_v2.parameters) {
    const list = paramsByPain.get(p.pain_point) ?? []
    list.push(p)
    paramsByPain.set(p.pain_point, list)
  }

  const dims = [...analysis.pain_points]
    .sort((a, b) => b.pain_score - a.pain_score)
    .slice(0, 6)
    .map((p) => {
      const params = paramsByPain.get(p.name) ?? []
      const conf = params.length
        ? params.reduce((s, x) => s + x.confidence, 0) / params.length
        : 0.6
      const evidence = params.reduce((s, x) => s + x.evidence_ids.length, 0)
      const v1 = Math.round(Math.min(95, Math.max(25, 100 - p.pain_score * 0.62)) * 10) / 10
      const fix = 0.55 + 0.4 * Math.min(1, Math.max(0, conf))
      const v2 = Math.round(Math.min(97, v1 + (97 - v1) * fix) * 10) / 10
      return {
        key: p.name,
        label: painLabel(p),
        v1,
        v2,
        delta: Math.round((v2 - v1) * 10) / 10,
        evidence,
        confidence: conf,
        reviewCount: p.review_count,
      }
    })
  return { dims }
}

/* ------------------------------------------------------------------ */
/* Root-cause category classifier (transparent keyword rules)          */
/* ------------------------------------------------------------------ */

const RC_RULES: { key: string; words: string[] }[] = [
  { key: 'rcCat.reliability', words: ['可靠性', '寿命', '失效', '故障', '疲劳', 'reliability', 'failure', 'stopped working'] },
  { key: 'rcCat.cleaning', words: ['清洁', '清洗', '缝隙', '残留', '霉菌', '拆', '刷', 'clean', 'mold', 'gunk', 'residue'] },
  { key: 'rcCat.dimension', words: ['直径', '口径', '尺寸', '规格', '杯架', '容量', '厚度', 'diameter', 'size', 'fit'] },
  { key: 'rcCat.info', words: ['详情页', '标注', '包装', '说明', '成分', 'listing', 'label', 'packaging', '型号', '适配对照', '效果承诺', '见效周期', '视觉呈现', '实拍'] },
  { key: 'rcCat.material', words: ['材料', '材质', '硅胶', '塑料', '金属', '食品级', '挥发', '异味', 'material', 'silicone', 'plastic', 'odor', '刷毛', '植毛', '表面工艺'] },
  { key: 'rcCat.process', words: ['工艺', '焊接', '真空', '涂层', '公差', '批次', '抽检', '质检', '出厂', 'process', 'welding', 'coating', 'qc', '库存', '气密'] },
  { key: 'rcCat.structure', words: ['密封', '结构', '卡扣', '铰链', '翻盖', '阀', '机构', '泵', '喷头', 'seal', 'hinge', 'valve', 'mechanism', '吸盘', '底座', '负压'] },
  { key: 'rcCat.ergonomics', words: ['发质', '握持', '人机', '易用', '开合', '单手', '手感', 'ergonomic', 'grip', 'hardness', '硬度'] },
  { key: 'rcCat.performance', words: ['电机', '电池', '功率', '续航', '功效', '浓度', '动力', 'motor', 'battery', 'power', 'efficacy', '负载'] },
]

function classifyRc(text: string): string {
  const t = text.toLowerCase()
  for (const r of RC_RULES) {
    if (r.words.some((w) => t.includes(w.toLowerCase()))) return r.key
  }
  return 'rcCat.general'
}

/* ------------------------------------------------------------------ */
/* Sankey: Pain → Root cause → Parameter                               */
/* (3-level layout — proportions matter; the engineering-domain        */
/*  classification lives on in the root-cause tooltip)                 */
/* ------------------------------------------------------------------ */

export interface SankeyHandles {
  /** pain display names present in the diagram (for click resolution) */
  painNames: string[]
}

type NodeMeta =
  | { kind: 'pain'; pain: PainPoint }
  | { kind: 'rc'; rc: RootCause; catKey: string }
  | { kind: 'param'; param: ParameterUpgrade }

/** width-aware label clip (CJK chars count double) */
const clipLabel = (s: string, max = 22) => {
  let w = 0
  let out = ''
  for (const ch of s) {
    w += /[\u2E80-\u9FFF\uF900-\uFFFD]/.test(ch) ? 2 : 1
    if (w > max) return `${out}…`
    out += ch
  }
  return s
}

export function buildEvolutionSankey(analysis: Analysis): { option: EChartsOption; handles: SankeyHandles } {
  const rcs = analysis.root_causes
  const painByKey = new Map(analysis.pain_points.map((p) => [p.name, p]))

  const nodes: { name: string; itemStyle: { color: string }; meta: NodeMeta }[] = []
  const links: { source: string; target: string; value: number }[] = []
  const painNames: string[] = []
  const linkedParams = new Set<string>()

  /* bare node names (no layer prefixes) for readability; a fallback prefix
     is only added if the bare name would collide with another node */
  const addNode = (base: string, fbKey: string, color: string, meta: NodeMeta): string => {
    const taken = (n: string) => nodes.some((x) => x.name === n)
    let name = base
    if (taken(name)) name = tr(fbKey, { n: base })
    if (!taken(name)) nodes.push({ name, itemStyle: { color }, meta })
    return name
  }

  /* pain → root cause → parameter */
  for (const p of analysis.pain_points) {
    const painNode = addNode(painLabel(p), 'evo.sankey.fbPain', painColor(p.name), { kind: 'pain', pain: p })
    painNames.push(painNode)

    const rc = rcs[p.name]
    let middle = painNode
    if (rc) {
      const catKey = classifyRc(rc.root_cause)
      middle = addNode(clipLabel(rc.root_cause, 24), 'evo.sankey.fbRoot', '#8B95B2', { kind: 'rc', rc, catKey })
      links.push({ source: painNode, target: middle, value: Math.max(1, p.review_count) })
    }

    for (const param of analysis.product_v2.parameters) {
      if (param.pain_point !== p.name) continue
      linkedParams.add(param.parameter)
      const paramNode = addNode(paramLabel(param.parameter), 'evo.sankey.fbParam', PALETTE.blue, { kind: 'param', param })
      links.push({ source: middle, target: paramNode, value: Math.max(1, param.evidence_ids.length) })
    }
  }

  /* parameters whose pain cluster is missing from the pain list still flow in */
  for (const param of analysis.product_v2.parameters) {
    if (linkedParams.has(param.parameter)) continue
    const pain = painByKey.get(param.pain_point)
    const paramNode = addNode(paramLabel(param.parameter), 'evo.sankey.fbParam', PALETTE.blue, { kind: 'param', param })
    if (pain) {
      const painNode = addNode(painLabel(pain), 'evo.sankey.fbPain', painColor(pain.name), { kind: 'pain', pain })
      links.push({ source: painNode, target: paramNode, value: Math.max(1, pain.review_count) })
    }
  }

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      trigger: 'item' as const,
      formatter: (params: unknown) => {
        const pr = params as {
          dataType?: string
          name?: string
          data?: { source?: string; target?: string; value?: number }
        }
        if (pr.dataType === 'edge' && pr.data?.source && pr.data?.target) {
          return `<b>${pr.data.source}</b><br/>→ ${pr.data.target}<br/>${tr('chart.flowWeight')} <b>${pr.data.value}</b>`
        }
        const node = nodes.find((n) => n.name === pr.name)
        if (!node) return `<b>${pr.name ?? ''}</b>`
        const m = node.meta
        if (m.kind === 'pain') {
          return (
            `<b>${pr.name}</b><br/>${tr('evo.sankey.tipReviews', { n: m.pain.review_count })} · ` +
            `${tr('evo.sankey.tipScore', { s: m.pain.pain_score.toFixed(0) })}<br/>` +
            `<span style="color:#4F7CFF">${tr('evo.sankey.tipClick')}</span>`
          )
        }
        if (m.kind === 'rc') {
          return (
            `<b>${pr.name}</b> <span style="color:#667085">· ${tr(m.catKey)} (${tr('evo.sankey.tipRcCat')})</span><br/>` +
            `${m.rc.root_cause}<br/>` +
            `${tr('evo.sankey.tipSeverity', { v: (m.rc.severity * 100).toFixed(0) })} · ` +
            `${tr('evo.sankey.tipEvCount', { n: m.rc.evidence_ids.length })}`
          )
        }
        const prio = priorityOf(m.param, painByKey.get(m.param.pain_point)?.pain_score ?? 0)
        return (
          `<b>${prio}</b> · <b>${pr.name}</b><br/>${m.param.current_state}<br/>→ <b>${m.param.recommended_state}</b><br/>` +
          `${tr('evo.sankey.tipConf', { v: (m.param.confidence * 100).toFixed(0) })} · ` +
          `${tr('evo.sankey.tipEvCount', { n: m.param.evidence_ids.length })}<br/>` +
          `<span style="color:#667085">${tr('evo.sankey.tipPrio')}</span>`
        )
      },
    },
    series: [
      {
        type: 'sankey' as never,
        layoutIterations: 32,
        nodeWidth: 12,
        nodeGap: 12,
        lineStyle: { color: 'gradient' as never, curveness: 0.55, opacity: 0.28 },
        label: {
          color: chartTheme.textBright,
          fontSize: 11,
          fontWeight: 500,
          formatter: (p: { name: string }) => clipLabel(p.name),
        },
        itemStyle: { borderWidth: 0 },
        emphasis: { focus: 'adjacency' as const },
        cursor: 'pointer',
        data: nodes,
        links,
      },
    ],
  } as EChartsOption

  return { option, handles: { painNames } }
}

/* ------------------------------------------------------------------ */
/* 2D Radar — V1 (muted dashed) vs V2 (primary filled)                 */
/* ------------------------------------------------------------------ */

export function buildEvolutionRadar(profile: CapabilityProfile): EChartsOption {
  const { dims } = profile
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      trigger: 'item' as const,
      formatter: (params: unknown) => {
        const pr = params as { name?: string; value?: number[] }
        const rows = dims
          .map(
            (d, i) =>
              `${wrapLabel(d.label).replace(/\n/g, ' ')}&nbsp;&nbsp;<b>${pr.value?.[i] ?? '—'}</b>` +
              (pr.name === tr('chart.v2evolved') ? ` <span style="color:#24B47E">(+${d.delta.toFixed(1)})</span>` : '')
          )
          .join('<br/>')
        return `<b>${pr.name ?? ''}</b><br/>${rows}`
      },
    },
    legend: {
      bottom: 0,
      textStyle: { color: chartTheme.textMuted, fontSize: 12 },
      itemWidth: 14,
      itemHeight: 8,
    },
    radar: {
      indicator: dims.map((d) => ({ name: wrapLabel(d.label), max: 100 })),
      center: ['50%', '50%'],
      radius: '62%',
      /* 5 rings → 20 / 40 / 60 / 80 / 100 on a fixed 0–100 scale */
      splitNumber: 5,
      axisName: { color: chartTheme.textMuted, fontSize: 11 },
      axisLine: { lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
      splitArea: { show: false },
    },
    graphic: [
      {
        type: 'text',
        left: 6,
        bottom: 24,
        style: { text: tr('evo.matrix.scale'), fill: chartTheme.textMuted, fontSize: 11, fontWeight: 500 },
      },
    ],
    series: [
      {
        type: 'radar',
        data: [
          {
            value: dims.map((d) => d.v1),
            name: tr('chart.v1current'),
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: '#98A2B3', type: 'dashed', width: 2 },
            itemStyle: { color: '#98A2B3' },
            areaStyle: { color: 'rgba(152,162,179,0.10)' },
          },
          {
            value: dims.map((d) => d.v2),
            name: tr('chart.v2evolved'),
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: PALETTE.blue, width: 2.5 },
            itemStyle: { color: PALETTE.blue },
            areaStyle: { color: 'rgba(79,124,255,0.14)' },
          },
        ],
      },
    ],
  } as EChartsOption
}

/* ------------------------------------------------------------------ */
/* 3D Evolution Matrix — X=capability Y=V1/V2/Δ Z=score (bar3D)        */
/* The Δ series is unique to the 3D view: it shows how much each       */
/* capability improves, which the radar overlay cannot express.        */
/* ------------------------------------------------------------------ */

const SERIES_3D = [
  { name: 'V1', color: '#98A2B3' },
  { name: 'V2', color: PALETTE.blue },
  { name: 'Δ', color: PALETTE.green },
]

export function buildEvolution3D(profile: CapabilityProfile): EChartsOption {
  const { dims } = profile
  const pick = (d: CapabilityDim, i: number) => (i === 0 ? d.v1 : i === 1 ? d.v2 : d.delta)
  const data: { value: [number, number, number]; itemStyle: { color: string; opacity: number } }[] = []
  dims.forEach((d, i) => {
    SERIES_3D.forEach((s, j) => {
      data.push({ value: [i, j, pick(d, j)], itemStyle: { color: s.color, opacity: j === 2 ? 0.95 : 0.88 } })
    })
  })

  const yLabels = SERIES_3D.map((s) => s.name.trim())

  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      formatter: (params: unknown) => {
        const pr = params as { value?: number[] }
        const v = pr.value ?? []
        const d = dims[Number(v[0])]
        if (!d) return ''
        const ver = yLabels[Number(v[1])] ?? ''
        if (ver === 'V1') {
          return `<b>${d.label}</b> · V1<br/>${tr('chart.score')} <b>${v[2]}</b> / 100<br/>${tr('evo.sankey.tipReviews', { n: d.reviewCount })}`
        }
        if (ver === 'V2') {
          return `<b>${d.label}</b> · V2<br/>${tr('chart.score')} <b>${v[2]}</b> / 100 · <span style="color:#24B47E">+${d.delta.toFixed(1)}</span><br/>${tr('evo.sankey.tipEvCount', { n: d.evidence })}`
        }
        return `<b>${d.label}</b> · ${tr('evo.matrix.delta')}<br/>+<b>${v[2]}</b> ${tr('evo.matrix.deltaUnit')}`
      },
    },
    grid3D: {
      boxWidth: 120,
      boxDepth: 72,
      boxHeight: 74,
      axisLine: { lineStyle: { color: chartTheme.axisLine, opacity: 0.9 } },
      axisTick: { lineStyle: { color: chartTheme.axisLine } },
      axisLabel: { textStyle: { color: chartTheme.textMuted, fontSize: 10 } },
      axisNameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
      axisPointer: { show: false },
      viewControl: {
        autoRotate: false,
        distance: 240,
        alpha: 20,
        beta: 32,
        minDistance: 140,
        maxDistance: 400,
      },
      light: { main: { intensity: 1.2, alpha: 35, beta: -25, shadow: true, shadowQuality: 'medium' }, ambient: { intensity: 0.55 } },
      environment: 'none',
      postEffect: { enable: false },
    },
    xAxis3D: {
      type: 'category',
      name: tr('chart.capability'),
      data: dims.map((d) => wrapLabel(d.label)),
      axisLabel: { textStyle: { fontSize: 9 } },
    },
    yAxis3D: { type: 'category', name: tr('chart.version'), data: yLabels },
    zAxis3D: { type: 'value', name: tr('chart.score'), min: 0, max: 100 },
    series: [
      {
        type: 'bar3D' as never,
        data,
        barSize: 6,
        bevelSize: 0.4,
        bevelSmoothness: 2,
        shading: 'lambert' as never,
        emphasis: { itemStyle: { opacity: 1 } },
      },
    ],
  } as EChartsOption
}
