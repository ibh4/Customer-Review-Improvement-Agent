/**
 * Shared pain-point scatter builders (3D landscape + 2D matrix + evidence map).
 * Used by Product MRI and Pain Galaxy — stable pain colors everywhere.
 * All UI strings go through tr(); pain bubbles use the bilingual painLabel().
 */
import type { EChartsOption } from 'echarts'
import type { PainPoint } from '../types'
import { chartTheme, painColor, tooltipStyle } from './theme'
import { painLabel, tr } from '../i18n/core'

/* generic tooltip body shared by 2D & 3D views */
export function painTooltipHtml(p: PainPoint): string {
  return (
    `<b style="color:${painColor(p.name)}">●</b> <b>${painLabel(p)}</b>` +
    ` <span style="color:#98A2B3">(${p.name})</span><br/>` +
    `${tr('chart.painScore')}&nbsp;&nbsp;&nbsp;&nbsp;<b>${p.pain_score.toFixed(0)}</b><br/>` +
    `${tr('chart.frequency')}&nbsp;&nbsp;&nbsp;&nbsp;<b>${(p.frequency * 100).toFixed(0)}%</b><br/>` +
    `${tr('chart.severity')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${(p.severity * 100).toFixed(0)}%</b><br/>` +
    `${tr('chart.helpfulness')}&nbsp;&nbsp;&nbsp;<b>${(p.helpfulness * 100).toFixed(0)}%</b><br/>` +
    `${tr('chart.evidence')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${tr('chart.evidenceLine', { n: p.evidence_review_ids.length, total: p.review_count })}</b>` +
    `<br/><span style="color:#98A2B3">${tr('chart.clickForEvidence')}</span>`
  )
}

const pctLabel = (v: number) => `${Math.round(v * 100)}%`

/** resolve a clicked bubble name back to its pain point (language-aware) */
export function findPainByName(pps: PainPoint[], name: string | undefined): PainPoint | undefined {
  return pps.find((x) => painLabel(x) === name || x.display_name === name || x.name === name)
}

/* ------------------------------------------------------------------ */
/* 3D Customer Pain Landscape — X=frequency Y=severity Z=helpfulness  */
/* bubble size = review count · stable pain colors                    */
/* ------------------------------------------------------------------ */
export function buildPainLandscape3D(pps: PainPoint[], autoRotate = false): EChartsOption {
  const maxFreq = Math.max(0.1, ...pps.map((p) => p.frequency)) * 1.25
  const maxRev = Math.max(...pps.map((p) => p.review_count), 1)
  return {
    backgroundColor: 'transparent',
    tooltip: {
      ...tooltipStyle,
      formatter: (params: unknown) => {
        const pr = params as { name?: string }
        const p = findPainByName(pps, pr.name)
        return p ? painTooltipHtml(p) : String(pr.name ?? '')
      },
    },
    grid3D: {
      boxWidth: 110,
      boxDepth: 110,
      boxHeight: 72,
      axisLine: { lineStyle: { color: chartTheme.axisLine, opacity: 0.9 } },
      axisTick: { lineStyle: { color: chartTheme.axisLine } },
      axisLabel: {
        textStyle: { color: chartTheme.textMuted, fontSize: 10 },
        formatter: (v: number) => `${Math.round(v * 100)}`,
      },
      axisNameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
      axisPointer: { show: false },
      viewControl: {
        autoRotate,
        autoRotateAfterStill: 2,
        distance: 265,
        alpha: 26,
        beta: 30,
        minDistance: 140,
        maxDistance: 420,
        rotateSensitivity: 1.1,
        zoomSensitivity: 1.1,
        panSensitivity: 1,
      },
      light: {
        main: { intensity: 1.25, alpha: 35, beta: -25, shadow: false },
        ambient: { intensity: 0.55 },
      },
      environment: 'none',
      postEffect: { enable: false },
    },
    xAxis3D: { type: 'value', name: tr('chart.frequencyPct'), min: 0, max: maxFreq },
    yAxis3D: { type: 'value', name: tr('chart.severity'), min: 0, max: 1 },
    zAxis3D: { type: 'value', name: tr('chart.helpfulness'), min: 0, max: 1 },
    series: [
      {
        type: 'scatter3D' as never,
        data: pps.map((p) => ({
          name: painLabel(p),
          value: [p.frequency, p.severity, p.helpfulness, p.review_count, p.pain_score],
          itemStyle: {
            color: painColor(p.name),
            opacity: 0.92,
          },
        })),
        symbolSize: (val: number[]) => 20 + Math.sqrt(Math.max(0, val[3])) * (26 / Math.sqrt(maxRev)),
        emphasis: {
          label: { show: true },
          itemStyle: { opacity: 1, shadowBlur: 6, shadowColor: 'rgba(20,32,60,0.18)' },
        },
        label: {
          show: true,
          position: 'top',
          distance: 6,
          formatter: (pr: { name: string }) => pr.name,
          textStyle: {
            color: chartTheme.textBright,
            fontSize: 11,
            fontWeight: 600,
            /* white halo keeps labels readable when they cross bubbles / grid */
            textBorderColor: '#FFFFFF',
            textBorderWidth: 3,
          },
        },
        itemStyle: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.8)' },
      },
    ],
  } as EChartsOption
}

/* ------------------------------------------------------------------ */
/* 2D fallback — frequency × severity bubbles                         */
/* ------------------------------------------------------------------ */
export function buildPainLandscape2D(pps: PainPoint[]): EChartsOption {
  const maxFreq = Math.max(0.1, ...pps.map((p) => p.frequency)) * 1.25
  const maxRev = Math.max(...pps.map((p) => p.review_count), 1)
  return {
    backgroundColor: 'transparent',
    grid: { left: 14, right: 30, top: 34, bottom: 48, containLabel: true },
    tooltip: {
      ...tooltipStyle,
      formatter: (params: unknown) => {
        const pr = params as { name?: string }
        const p = findPainByName(pps, pr.name)
        return p ? painTooltipHtml(p) : String(pr.name ?? '')
      },
    },
    xAxis: {
      type: 'value',
      name: tr('chart.frequencyShare'),
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      max: maxFreq,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11, formatter: pctLabel },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: tr('chart.severity'),
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      max: 1,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { lineStyle: { color: chartTheme.splitLine } },
    },
    series: [
      {
        type: 'scatter',
        cursor: 'pointer',
        data: pps.map((p) => ({
          name: painLabel(p),
          value: [p.frequency, p.severity, p.review_count],
          itemStyle: { color: painColor(p.name), opacity: 0.9, borderColor: '#FFFFFF', borderWidth: 1.5 },
        })),
        symbolSize: (val: number[]) => 16 + Math.sqrt(Math.max(0, val[2])) * (30 / Math.sqrt(maxRev)),
        emphasis: { scale: 1.15, itemStyle: { shadowBlur: 14, shadowColor: 'rgba(20,32,60,0.18)' } },
        label: {
          show: true,
          position: 'top',
          distance: 9,
          color: chartTheme.textBright,
          fontSize: 11,
          fontWeight: 500,
          formatter: (pr: { name: string }) => pr.name,
        },
        labelLayout: { hideOverlap: false, moveOverlap: 'shiftY' as never },
      },
    ],
  } as EChartsOption
}

/* ------------------------------------------------------------------ */
/* 2D Matrix with dynamic quadrants (midpoint split, never hardcoded)  */
/* ------------------------------------------------------------------ */
export function buildPainMatrix2D(pps: PainPoint[]): EChartsOption {
  const xs = pps.map((p) => p.frequency)
  const ys = pps.map((p) => p.severity)
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2
  const maxRev = Math.max(...pps.map((p) => p.review_count), 1)
  const fmt = (v: number) => `${Math.round(v * 100)}%`
  return {
    backgroundColor: 'transparent',
    grid: { left: 14, right: 34, top: 34, bottom: 48, containLabel: true },
    tooltip: {
      ...tooltipStyle,
      formatter: (params: unknown) => {
        const pr = params as { name?: string }
        const p = findPainByName(pps, pr.name)
        return p ? painTooltipHtml(p) : String(pr.name ?? '')
      },
    },
    xAxis: {
      type: 'value',
      name: tr('chart.frequency'),
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11, formatter: fmt },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: tr('chart.severity'),
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11, formatter: fmt },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'scatter',
        cursor: 'pointer',
        data: pps.map((p) => ({
          name: painLabel(p),
          value: [p.frequency, p.severity, p.review_count],
          itemStyle: { color: painColor(p.name), opacity: 0.9, borderColor: '#FFFFFF', borderWidth: 1.5 },
        })),
        symbolSize: (val: number[]) => 16 + Math.sqrt(Math.max(0, val[2])) * (30 / Math.sqrt(maxRev)),
        emphasis: { scale: 1.12 },
        label: {
          show: true,
          position: 'top',
          distance: 9,
          color: chartTheme.textBright,
          fontSize: 11,
          fontWeight: 500,
          formatter: (pr: { name: string }) => pr.name,
        },
        labelLayout: { hideOverlap: false, moveOverlap: 'shiftY' as never },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(127,137,170,0.05)' },
          label: { position: 'inside', color: '#98A2B3', fontSize: 10, fontWeight: 600, distance: 8 },
          data: [
            [
              { xAxis: 0, yAxis: 0, name: tr('chart.quad.low') },
              { xAxis: midX, yAxis: midY },
            ],
            [
              { xAxis: midX, yAxis: 0, name: tr('chart.quad.watch') },
              { xAxis: 'max', yAxis: midY },
            ],
            [
              { xAxis: 0, yAxis: midY, name: tr('chart.quad.fixNext') },
              { xAxis: midX, yAxis: 'max' },
            ],
            [
              { xAxis: midX, yAxis: midY, name: tr('chart.quad.critical') },
              { xAxis: 'max', yAxis: 'max' },
            ],
          ],
        },
      },
    ],
  } as EChartsOption
}

/* ------------------------------------------------------------------ */
/* Evidence Map — pain score × evidence count                          */
/* ------------------------------------------------------------------ */
export function buildEvidenceMap2D(pps: PainPoint[]): EChartsOption {
  const maxEv = Math.max(...pps.map((p) => p.evidence_review_ids.length), 1)
  const midScore = (Math.min(...pps.map((p) => p.pain_score)) + Math.max(...pps.map((p) => p.pain_score))) / 2
  const midEv = maxEv / 2
  return {
    backgroundColor: 'transparent',
    grid: { left: 14, right: 34, top: 34, bottom: 48, containLabel: true },
    tooltip: {
      ...tooltipStyle,
      formatter: (params: unknown) => {
        const pr = params as { name?: string }
        const p = findPainByName(pps, pr.name)
        return p ? painTooltipHtml(p) : String(pr.name ?? '')
      },
    },
    xAxis: {
      type: 'value',
      name: tr('chart.painScore'),
      nameLocation: 'middle',
      nameGap: 34,
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      max: 100,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: tr('chart.evidenceReviews'),
      nameTextStyle: { color: chartTheme.textMuted, fontSize: 11 },
      min: 0,
      axisLabel: { color: chartTheme.textMuted, fontSize: 11 },
      axisLine: { show: true, lineStyle: { color: chartTheme.axisLine } },
      splitLine: { show: false },
    },
    series: [
      {
        type: 'scatter',
        cursor: 'pointer',
        data: pps.map((p) => ({
          name: painLabel(p),
          value: [p.pain_score, p.evidence_review_ids.length, p.review_count],
          itemStyle: { color: painColor(p.name), opacity: 0.9, borderColor: '#FFFFFF', borderWidth: 1.5 },
        })),
        symbolSize: (val: number[]) => 16 + Math.sqrt(Math.max(0, val[2])) * 1.6,
        emphasis: { scale: 1.12 },
        label: {
          show: true,
          position: 'top',
          distance: 9,
          color: chartTheme.textBright,
          fontSize: 11,
          fontWeight: 500,
          formatter: (pr: { name: string }) => pr.name,
        },
        labelLayout: { hideOverlap: false, moveOverlap: 'shiftY' as never },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: chartTheme.axisLine, type: 'dashed' as const },
          label: { show: false },
          data: [
            { xAxis: midScore },
            { yAxis: midEv },
          ],
        },
        markArea: {
          silent: true,
          itemStyle: { color: 'rgba(36,180,126,0.05)' },
          label: { position: 'inside', color: '#24B47E', fontSize: 10, fontWeight: 600, distance: 8 },
          data: [
            [
              { xAxis: midScore, yAxis: midEv, name: tr('chart.quad.strongEvidence') },
              { xAxis: 'max', yAxis: 'max' },
            ],
          ],
        },
      },
    ],
  } as EChartsOption
}
