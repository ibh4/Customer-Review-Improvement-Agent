/**
 * Unified light chart theme + stable pain-point color mapping.
 * All pages import colors from here — no ad-hoc palettes in pages.
 */

export const PALETTE = {
  blue: '#4F7CFF',
  violet: '#7C5CFC',
  cyan: '#19B5D1',
  green: '#24B47E',
  orange: '#FF9F43',
  pink: '#EF6A9A',
  red: '#EA5B5B',
  indigo: '#5965D8',
} as const

/** generic series order */
export const SERIES_COLORS = [
  PALETTE.blue,
  PALETTE.violet,
  PALETTE.cyan,
  PALETTE.green,
  PALETTE.orange,
  PALETTE.pink,
]

/** rating star colors (1..5) */
export const RATING_COLORS: Record<string, string> = {
  '1': '#EA5B5B',
  '2': '#F08A6C',
  '3': '#FF9F43',
  '4': '#7FCBA4',
  '5': '#24B47E',
}

/* ---------- stable pain point colors (same across all pages) ---------- */
const PAIN_COLOR_MAP: Record<string, string> = {
  'Functional Failure': PALETTE.blue,
  'Cleaning Difficulty': PALETTE.cyan,
  'Drying & Clogging': PALETTE.orange,
  Durability: PALETTE.violet,
  'Odor & Taste': PALETTE.pink,
  'Shipping & Packaging': PALETTE.indigo,
  Leakage: PALETTE.blue,
  'Battery & Charging': PALETTE.green,
  'Fit & Size': PALETTE.orange,
  Comfort: PALETTE.pink,
}

const PAIN_FALLBACKS = [PALETTE.green, PALETTE.red, PALETTE.indigo, PALETTE.cyan, PALETTE.orange, PALETTE.pink, PALETTE.violet]

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0
  }
  return h
}

/** stable color for a pain point by its english name */
export function painColor(name: string): string {
  return PAIN_COLOR_MAP[name] ?? PAIN_FALLBACKS[hashStr(name) % PAIN_FALLBACKS.length]
}

/** light tint background for a pain color (keyword highlight, chips) */
export function painTint(name: string): string {
  return painColor(name) + '1F' // 12% alpha hex
}

/** pain score severity color (for scores, not identity) */
export function painScoreColor(score: number): string {
  if (score >= 75) return PALETTE.red
  if (score >= 55) return PALETTE.orange
  if (score >= 35) return PALETTE.violet
  return PALETTE.blue
}

/* ---------- shared echarts style tokens ---------- */
export const chartTheme = {
  /* text */
  textMuted: '#667085',
  textBright: '#172033',
  /* axes */
  axisLine: '#D6DCE8',
  splitLine: '#E9EDF5',
  /* tooltip: white card, light border, soft shadow */
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E6EAF1',
  fontSize: 12,
} as const

/** standard tooltip config object (spread into option.tooltip) */
export const tooltipStyle = {
  backgroundColor: chartTheme.tooltipBg,
  borderColor: chartTheme.tooltipBorder,
  borderWidth: 1,
  padding: [10, 14] as number[],
  textStyle: { color: chartTheme.textBright, fontSize: 12 },
  extraCssText: 'box-shadow: 0 8px 24px rgba(20,32,60,0.10); border-radius: 10px;',
} as const

/** standard category/value axis fragments */
export const axisText = { color: chartTheme.textMuted, fontSize: 12 } as const
export const axisLineShow = { show: true, lineStyle: { color: chartTheme.axisLine } } as const
export const splitLineShow = { lineStyle: { color: chartTheme.splitLine } } as const
