import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, Info, Search, X, Bot, ClipboardPaste, Send, Sparkles } from 'lucide-react'
import type { EChartsOption } from 'echarts'
import { api } from '../api/client'
import { useAnalysis } from '../hooks/useAnalysis'
import { useProduct } from '../context/ProductContext'
import { useChart } from '../hooks/useChart'
import type { PainPoint, Review } from '../types'
import { chartTheme, painColor, tooltipStyle } from '../charts/theme'
import { AIInsight } from '../components/ChartCard'
import { ReviewCard } from '../components/ReviewCard'
import { EmptyState, ErrorCard, ReviewPager, REVIEW_PAGE_SIZE, ScoreBar, SkeletonBlock, Stars } from '../components/ui'
import { useI18n, painLabel } from '../i18n'
import '../i18n/pages/evidence'

function AgentReviewPanel() {
  const { currentProduct } = useProduct()
  const [text, setText] = useState('')
  const [result, setResult] = useState<import('../api/client').AgentReviewAnalysis | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const analyze = async () => {
    if (text.trim().length < 3) return
    setBusy(true); setError(null)
    try { setResult(await api.analyzeReview(text.trim(), currentProduct?.product_id)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Agent request failed') }
    finally { setBusy(false) }
  }
  return <section className="rounded-2xl border border-violet/25 bg-gradient-to-br from-violet/[0.06] via-card to-primary/[0.04] p-4 shadow-card md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet"><Bot className="h-4 w-4" /> Agent 评论分析</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">粘贴一条商品评价，让 Agent 转化为改进方案</h2>
        <p className="mt-1 text-xs text-muted">支持 OpenAI 兼容接口和结构化输出；接口不可用时自动切换规则分析。</p>
      </div>
       <span className="rounded-full border border-violet/25 bg-violet/10 px-2.5 py-1 text-[10px] font-semibold text-violet">评论 → 洞察 → 改进</span>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="请粘贴原始商品评价……" className="min-h-[156px] w-full resize-y rounded-xl border border-line bg-card p-3 text-sm text-ink outline-none placeholder:text-faint focus:border-primary" />
        <div className="mt-2 flex items-center justify-between gap-2">
          <button type="button" onClick={() => navigator.clipboard?.readText().then(setText)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-xs text-muted hover:border-primary hover:text-primary"><ClipboardPaste className="h-3.5 w-3.5" /> 从剪贴板粘贴</button>
          <button type="button" disabled={busy || text.trim().length < 3} onClick={analyze} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45">{busy ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Send className="h-3.5 w-3.5" />} {busy ? '分析中……' : '分析评价'}</button>
        </div>
        {error && <p className="mt-2 rounded-lg bg-red/10 p-2 text-xs text-red">{error}</p>}
      </div>
      <div className="min-h-[156px] rounded-xl border border-line bg-card p-4">
        {!result ? <div className="flex h-full min-h-[140px] flex-col items-center justify-center text-center text-xs text-muted"><Bot className="mb-2 h-7 w-7 text-violet/60" /><p>Agent 分析结果将在这里显示</p><p className="mt-1 text-[10px] text-faint">摘要 · 痛点 · 根因 · 改进建议</p></div> : <div className="space-y-3 text-xs">
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-red/10 px-2 py-1 font-semibold text-red">{result.sentiment === 'negative' ? '负面' : result.sentiment === 'positive' ? '正面' : '中性/混合'}</span><span className="rounded-full bg-primary/10 px-2 py-1 font-semibold text-primary">预计评分 {result.rating_estimate}/5</span><span className="rounded-full bg-success/10 px-2 py-1 font-semibold text-success">置信度 {(result.confidence * 100).toFixed(0)}%</span><span className="text-[10px] text-faint">{result.mode === 'heuristic' ? '规则模式' : 'AI 模式'}</span></div>
          <p className="leading-relaxed text-ink"><b>摘要：</b> {result.summary}</p>
          <p><b>痛点：</b> {result.pain_points.join(' · ')}</p>
          <p><b>根因：</b> {result.root_cause}</p>
          <p><b>改进建议：</b> {result.recommended_action}</p>
          {result.evidence_phrases.length > 0 && <div className="flex flex-wrap gap-1.5">{result.evidence_phrases.map((x, i) => <span key={i} className="rounded-md bg-violet/10 px-2 py-1 text-violet">“{x}”</span>)}</div>}
        </div>}
      </div>
    </div>
  </section>
}

type SortMode = 'relevance' | 'helpful' | 'newest' | 'oldest'
type RatingMode = 'any' | '1' | '2' | '3' | '45'

const SORTS: { key: SortMode; label: string }[] = [
  { key: 'relevance', label: 'ev.sort.relevance' },
  { key: 'helpful', label: 'ev.sort.helpful' },
  { key: 'newest', label: 'ev.sort.newest' },
  { key: 'oldest', label: 'ev.sort.oldest' },
]

const RATINGS: { key: RatingMode; label: string }[] = [
  { key: 'any', label: 'ev.rating.any' },
  { key: '1', label: 'ev.rating.1' },
  { key: '2', label: 'ev.rating.2' },
  { key: '3', label: 'ev.rating.3' },
  { key: '45', label: 'ev.rating.45' },
]

const monthOf = (ts: number) => {
  const d = new Date(ts * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** count how many pain keywords appear in this review (case-insensitive) */
function keywordHits(review: Review, keywords: string[]): number {
  const hay = `${review.review_title} ${review.review_text}`.toLowerCase()
  return keywords.reduce((n, k) => (k && k.length > 1 && hay.includes(k.toLowerCase()) ? n + 1 : n), 0)
}

/**
 * Derived evidence strength 0–100 (transparent formula, not a model output):
 *   45% rating severity + 30% normalized helpfulness + 25% keyword coverage
 */
function evidenceScore(review: Review, keywords: string[], maxHelpful: number): number {
  const sev = Math.max(0, Math.min(1, (5 - review.rating) / 4))
  const help = maxHelpful > 0 ? Math.min(1, review.helpful_vote / maxHelpful) : 0
  const kw = keywords.length > 0 ? Math.min(1, keywordHits(review, keywords) / keywords.length) : 0
  return Math.round((sev * 0.45 + help * 0.3 + kw * 0.25) * 100)
}

/* ---------------- review inspector (right column) ---------------- */

function Inspector({
  review,
  pain,
  maxHelpful,
  onClose,
}: {
  review: Review
  pain: PainPoint | null
  maxHelpful: number
  onClose: () => void
}) {
  const { t } = useI18n()
  const score = evidenceScore(review, pain?.keywords ?? [], maxHelpful)
  const hits = pain ? keywordHits(review, pain.keywords) : 0
  const matched = pain ? pain.keywords.filter((k) => k.length > 1 && `${review.review_title} ${review.review_text}`.toLowerCase().includes(k.toLowerCase())) : []
  const date = new Date(review.timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const gaugeColor = score >= 70 ? '#EA5B5B' : score >= 45 ? '#FF9F43' : '#24B47E'

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('ev.inspector.title')}</p>
          <p className="tnum mt-0.5 text-[11px] text-faint">{review.review_id}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-line bg-card p-1.5 text-muted transition hover:border-primary hover:text-ink"
          aria-label={t('ev.inspector.close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="rounded-xl border border-line bg-base2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted">{t('ev.inspector.rating')}</span>
          <span className="flex items-center gap-2">
            <Stars rating={review.rating} />
            <span className="tnum text-sm font-semibold text-ink">{review.rating.toFixed(1)}</span>
          </span>
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <span className="text-muted">{t('ev.inspector.date')}</span>
          <span className="tnum font-medium text-ink">{date}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-muted">{t('ev.inspector.helpfulness')}</span>
          <span className="tnum font-medium text-ink">{t('ev.inspector.votes', { n: review.helpful_vote })}</span>
        </div>
      </div>

      {/* derived evidence strength gauge */}
      <div className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {t('ev.inspector.strength')}
            <span title={t('ev.inspector.strengthTip')}>
              <Info className="h-3 w-3 cursor-help text-faint" />
            </span>
          </p>
          <span className="tnum text-2xl font-semibold" style={{ color: gaugeColor }}>
            {score}
          </span>
        </div>
        <div className="mt-2.5">
          <ScoreBar value={score} color={gaugeColor} />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-faint">
          {t('ev.inspector.strengthNote')}
        </p>
      </div>

      <div className="space-y-2.5 rounded-xl border border-line bg-base2 p-4 text-[12px]">
        <p className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">{t('ev.inspector.signal')}</span>
          <span className="text-right font-medium text-ink">
            {review.matched_pain ?? '—'}
          </span>
        </p>
        {pain && (
          <p className="flex items-start justify-between gap-3">
            <span className="shrink-0 text-muted">{t('ev.inspector.painPoint')}</span>
            <span className="inline-flex items-center gap-1.5 text-right font-medium text-ink">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: painColor(pain.name) }} />
              {painLabel(pain)}
            </span>
          </p>
        )}
        <p className="flex items-start justify-between gap-3">
          <span className="shrink-0 text-muted">{t('ev.inspector.keywordMatches')}</span>
          <span className="tnum text-right font-medium text-ink">
            {t('ev.inspector.keywordOf', { hits, total: pain?.keywords.length ?? 0 })}
          </span>
        </p>
        {matched.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {matched.map((k) => (
              <span
                key={k}
                className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                style={{
                  background: pain ? painColor(pain.name) + '14' : '#EEF3FF',
                  color: pain ? painColor(pain.name) : '#3B63D6',
                }}
              >
                {k}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] leading-relaxed text-faint">
        {t('ev.inspector.source', {
          source: review.data_source === 'synthetic_demo' ? t('ev.inspector.sourceSynthetic') : t('ev.inspector.sourceAmazon'),
        })}
      </p>
    </div>
  )
}

/* ---------------- main page ---------------- */

export function EvidenceExplorer() {
  const { t, lang } = useI18n()
  const { analysis, loading: analysisLoading, error: analysisError, reload } = useAnalysis()
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewsError, setReviewsError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('relevance')
  const [monthFilter, setMonthFilter] = useState<string | null>(null)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const painParam = searchParams.get('pain')
  const ratingParam = (searchParams.get('rating') ?? 'any') as RatingMode

  const sortedPainPoints = useMemo(
    () => (analysis ? [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score) : []),
    [analysis]
  )

  const selected = useMemo(() => {
    if (sortedPainPoints.length === 0) return null
    return sortedPainPoints.find((p) => p.pain_point_id === painParam) ?? sortedPainPoints[0]
  }, [sortedPainPoints, painParam])

  /* keep URL in sync with selection (preserve rating filter) */
  useEffect(() => {
    if (selected && selected.pain_point_id !== painParam) {
      const next: Record<string, string> = { pain: selected.pain_point_id }
      if (ratingParam !== 'any') next.rating = ratingParam
      setSearchParams(next, { replace: true })
    }
  }, [selected, painParam, ratingParam, setSearchParams])

  /* load evidence for selected pain point */
  useEffect(() => {
    if (!selected) return
    let cancelled = false
    setReviewsLoading(true)
    setReviewsError(null)
    setReviews([])
    setMonthFilter(null)
    setSelectedReviewId(null)
    setPage(1)
    api
      .evidence(selected.pain_point_id)
      .then((list) => {
        if (cancelled) return
        setReviews(list)
        setReviewsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setReviewsError(err instanceof Error ? err.message : String(err))
        setReviewsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selected])

  /* ------- filtering + sorting ------- */
  const filtered = useMemo(() => {
    let list = [...reviews]
    if (ratingParam === '1') list = list.filter((r) => r.rating <= 1.5)
    else if (ratingParam === '2') list = list.filter((r) => r.rating <= 2.5)
    else if (ratingParam === '3') list = list.filter((r) => r.rating <= 3.5)
    else if (ratingParam === '45') list = list.filter((r) => r.rating >= 3.5)
    if (monthFilter) list = list.filter((r) => monthOf(r.timestamp) === monthFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (r) => r.review_title.toLowerCase().includes(q) || r.review_text.toLowerCase().includes(q)
      )
    }
    const kws = selected?.keywords ?? []
    switch (sort) {
      case 'helpful':
        list.sort((a, b) => b.helpful_vote - a.helpful_vote)
        break
      case 'newest':
        list.sort((a, b) => b.timestamp - a.timestamp)
        break
      case 'oldest':
        list.sort((a, b) => a.timestamp - b.timestamp)
        break
      default:
        list.sort((a, b) => {
          const d = keywordHits(b, kws) - keywordHits(a, kws)
          return d !== 0 ? d : b.helpful_vote - a.helpful_vote
        })
    }
    return list
  }, [reviews, ratingParam, monthFilter, query, sort, selected])

  /* back to page 1 whenever the filter/sort criteria change */
  useEffect(() => {
    setPage(1)
  }, [query, sort, monthFilter, ratingParam])

  /* pagination window over the filtered stream */
  const pageCount = Math.max(1, Math.ceil(filtered.length / REVIEW_PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * REVIEW_PAGE_SIZE, page * REVIEW_PAGE_SIZE)

  const selectedReview = useMemo(
    () => filtered.find((r) => r.review_id === selectedReviewId) ?? reviews.find((r) => r.review_id === selectedReviewId) ?? null,
    [filtered, reviews, selectedReviewId]
  )

  /* ------- monthly timeline aggregation (from real review timestamps) ------- */
  const monthly = useMemo(() => {
    const map = new Map<string, { count: number; neg: number; sumRating: number }>()
    for (const r of reviews) {
      const m = monthOf(r.timestamp)
      const cur = map.get(m) ?? { count: 0, neg: 0, sumRating: 0 }
      cur.count += 1
      cur.sumRating += r.rating
      if (r.rating <= 3) cur.neg += 1
      map.set(m, cur)
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        count: v.count,
        negativeShare: v.count > 0 ? v.neg / v.count : 0,
        avgRating: v.count > 0 ? v.sumRating / v.count : 0,
      }))
  }, [reviews])

  const accent = selected ? painColor(selected.name) : '#4F7CFF'

  const timelineOption = useMemo<EChartsOption | null>(() => {
    if (monthly.length === 0) return null
    return {
      backgroundColor: 'transparent',
      grid: { left: 8, right: 8, top: 22, bottom: 26, containLabel: true },
      tooltip: {
        ...tooltipStyle,
        formatter: (params: unknown) => {
          const pr = params as { dataIndex?: number }
          const d = monthly[Number(pr.dataIndex ?? 0)]
          if (!d) return ''
          return (
            `<b>${d.month}</b><br/>` +
            `${t('ev.timeline.tooltipReviews')}&nbsp;<b>${d.count}</b><br/>` +
            `${t('ev.timeline.tooltipAvg')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${d.avgRating.toFixed(2)}★</b><br/>` +
            `${t('ev.timeline.tooltipNeg')}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>${Math.round(d.negativeShare * 100)}%</b><br/>` +
            `<span style="color:#98A2B3">${t('ev.timeline.clickFilter')}</span>`
          )
        },
      },
      xAxis: {
        type: 'category',
        data: monthly.map((d) => d.month),
        axisLabel: { color: chartTheme.textMuted, fontSize: 10, rotate: monthly.length > 14 ? 40 : 0 },
        axisLine: { lineStyle: { color: chartTheme.axisLine } },
        axisTick: { show: false },
      },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: chartTheme.textMuted, fontSize: 10 }, splitLine: { lineStyle: { color: chartTheme.splitLine } } },
      series: [
        {
          type: 'bar',
          cursor: 'pointer',
          data: monthly.map((d) => ({
            value: d.count,
            itemStyle: {
              color: accent,
              opacity: monthFilter && monthFilter !== d.month ? 0.22 : 0.38 + 0.62 * d.negativeShare,
              borderRadius: [3, 3, 0, 0],
            },
          })),
          barMaxWidth: 22,
          emphasis: { itemStyle: { opacity: 1 } },
        },
      ],
    } as EChartsOption
  }, [monthly, accent, monthFilter, t, lang])

  const [tlCont] = useChart(timelineOption, (info) => {
    const d = monthly[info.dataIndex]
    if (!d) return
    setMonthFilter((cur) => (cur === d.month ? null : d.month))
  })

  const setRating = (r: RatingMode) => {
    const next: Record<string, string> = {}
    if (selected) next.pain = selected.pain_point_id
    if (r !== 'any') next.rating = r
    setSearchParams(next)
  }

  const maxHelpful = useMemo(() => Math.max(1, ...reviews.map((r) => r.helpful_vote)), [reviews])

  const insight = useMemo(() => {
    if (!selected || reviews.length === 0) return ''
    const withVotes = reviews.filter((r) => r.helpful_vote > 0).length
    const avgHelp = reviews.reduce((s, r) => s + r.helpful_vote, 0) / reviews.length
    return t('ev.insight', {
      label: painLabel(selected),
      n: reviews.length,
      voted: withVotes,
      avg: avgHelp.toFixed(1),
    })
  }, [selected, reviews, t, lang])

  if (analysisLoading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-14" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_1fr_330px]">
          <SkeletonBlock className="h-[560px]" />
          <div className="space-y-4">
            <SkeletonBlock className="h-[150px]" />
            <SkeletonBlock className="h-[300px]" />
          </div>
          <SkeletonBlock className="h-[560px]" />
        </div>
      </div>
    )
  }

  if (analysisError || !analysis) {
    return <ErrorCard title={t('ev.error.unavailable')} message={analysisError ?? t('ev.error.noAnalysis')} onRetry={reload} />
  }

  const hasTime = monthly.length >= 2

  return (
    <div className="space-y-4 fade-in">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan">{t('ev.title.eyebrow')}</p>
          <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{t('ev.title.h1')}</h1>
          <p className="mt-1 text-sm text-muted">
            {selected ? (
              <>
                <span className="font-medium text-ink">{painLabel(selected)}</span>
                {painLabel(selected) !== selected.name ? ` (${selected.name})` : ''} ·{' '}
                <span className="tnum">{selected.evidence_review_ids.length}</span>{' '}
                {t('ev.head.evidenceReviews')} · {t('ev.head.avg')}{' '}
                <span className="tnum">{selected.avg_rating.toFixed(2)}★</span>
              </>
            ) : (
              t('ev.title.noneSelected')
            )}
          </p>
        </div>
        <Link
          to={`/evolution?pain=${encodeURIComponent(selected?.pain_point_id ?? '')}`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-primarydeep"
        >
          {t('ev.viewFix')}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <AIInsight text={insight} tag={t('ev.insightTag')} />

      <AgentReviewPanel />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[290px_1fr_330px]">
        {/* -------- left: pain point list -------- */}
        <aside className="h-fit rounded-2xl border border-line bg-card p-3 shadow-card lg:sticky lg:top-[116px]">
          <p className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            {t('ev.list.title')}
          </p>
          <ul className="space-y-1.5">
            {sortedPainPoints.map((p) => {
              const active = selected?.pain_point_id === p.pain_point_id
              const c = painColor(p.name)
              return (
                <li key={p.pain_point_id}>
                  <button
                    type="button"
                    onClick={() => {
                      const next: Record<string, string> = { pain: p.pain_point_id }
                      if (ratingParam !== 'any') next.rating = ratingParam
                      setSearchParams(next)
                    }}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${
                      active ? 'border-transparent' : 'border-transparent hover:bg-cardhover'
                    }`}
                    style={active ? { background: c + '14', borderColor: c + '59' } : undefined}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
                        <span className={`truncate text-sm font-medium ${active ? 'text-ink' : 'text-ink'}`}>
                          {painLabel(p)}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-sm font-semibold" style={{ color: c }}>
                        {p.pain_score.toFixed(0)}
                      </span>
                    </span>
                    <span className="tnum mt-0.5 block text-[11px] text-muted">
                      {t('ev.list.counts', { n: p.evidence_review_ids.length, m: p.review_count })}
                    </span>
                    <span className="mt-1.5 block">
                      <ScoreBar value={p.pain_score} color={c} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* -------- middle: timeline + search + review stream -------- */}
        <section className="min-w-0 space-y-4">
          {/* evidence over time */}
          <div className="rounded-2xl border border-line bg-card shadow-card">
            <header className="flex flex-wrap items-center justify-between gap-2 px-5 pb-2 pt-4">
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-ink">{t('ev.timeline.title')}</h2>
                <p className="mt-0.5 text-xs text-muted">
                  {t('ev.timeline.sub')}
                </p>
              </div>
              {monthFilter && (
                <button
                  type="button"
                  onClick={() => setMonthFilter(null)}
                  className="inline-flex items-center gap-1 rounded-lg border border-primary/50 bg-tint px-2.5 py-1 text-[11px] font-medium text-primary transition hover:bg-primary/10"
                >
                  {monthFilter}
                  <X className="h-3 w-3" />
                </button>
              )}
            </header>
            <div className="px-3 pb-3">
              {reviewsLoading ? (
                <SkeletonBlock className="h-[130px]" />
              ) : hasTime ? (
                <div ref={tlCont} className="h-[140px]" />
              ) : (
                <EmptyState
                  label={reviews.length === 0 ? t('ev.timeline.emptyNoData') : t('ev.timeline.emptyShort')}
                  hint={
                    reviews.length === 0
                      ? t('ev.timeline.emptyNoDataHint')
                      : t('ev.timeline.emptyShortHint')
                  }
                />
              )}
            </div>
          </div>

          {/* search / filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-card p-2.5 shadow-card">
            <label className="relative min-w-[180px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('ev.search.placeholder')}
                className="w-full rounded-lg border border-line bg-base2 py-2 pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-faint focus:border-primary"
              />
            </label>
            <select
              value={ratingParam}
              onChange={(e) => setRating(e.target.value as RatingMode)}
              className="rounded-lg border border-line bg-base2 px-2.5 py-2 text-xs text-ink outline-none transition focus:border-primary"
              aria-label={t('ev.filter.rating')}
            >
              {RATINGS.map((r) => (
                <option key={r.key} value={r.key}>
                  {t(r.label)}
                </option>
              ))}
            </select>
            <div className="seg" role="tablist" aria-label={t('ev.filter.sort')}>
              {SORTS.map((s) => (
                <button key={s.key} type="button" data-active={sort === s.key} onClick={() => setSort(s.key)}>
                  {t(s.label)}
                </button>
              ))}
            </div>
          </div>

          {/* review stream */}
          <div className="space-y-3">
            {reviewsLoading && (
              <div className="space-y-3">
                <SkeletonBlock className="h-[130px]" />
                <SkeletonBlock className="h-[130px]" />
                <SkeletonBlock className="h-[130px]" />
              </div>
            )}
            {!reviewsLoading && reviewsError && (
              <ErrorCard title={t('ev.stream.errorTitle')} message={reviewsError} />
            )}
            {!reviewsLoading && !reviewsError && filtered.length === 0 && (
              <div className="rounded-2xl border border-line bg-card shadow-card">
                <EmptyState
                  label={t('ev.stream.empty')}
                  hint={
                    reviews.length === 0
                      ? t('ev.stream.emptyNoReviews')
                      : t('ev.stream.emptyFiltered')
                  }
                />
              </div>
            )}
            {!reviewsLoading &&
              !reviewsError &&
              pageItems.map((r) => (
                <ReviewCard
                  key={r.review_id}
                  review={r}
                  keywords={selected?.keywords}
                  accent={accent}
                  onClick={() => setSelectedReviewId(r.review_id === selectedReviewId ? null : r.review_id)}
                  active={r.review_id === selectedReviewId}
                />
              ))}
            {!reviewsLoading && !reviewsError && filtered.length > 0 && (
              <ReviewPager page={page} pageCount={pageCount} total={filtered.length} onChange={setPage} />
            )}
            {!reviewsLoading && !reviewsError && filtered.length > 0 && (
              <p className="tnum pb-2 text-center text-[11px] text-faint">
                {monthFilter
                  ? t('ev.stream.countMonth', { n: filtered.length, total: reviews.length, month: monthFilter })
                  : t('ev.stream.count', { n: filtered.length, total: reviews.length })}
              </p>
            )}
          </div>
        </section>

        {/* -------- right: inspector -------- */}
        <aside className="h-fit rounded-2xl border border-line bg-card p-5 shadow-card lg:sticky lg:top-[116px]">
          {selectedReview ? (
            <Inspector
              review={selectedReview}
              pain={selected}
              maxHelpful={maxHelpful}
              onClose={() => setSelectedReviewId(null)}
            />
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('ev.aside.title')}</p>
              <EmptyState
                label={t('ev.aside.select')}
                hint={t('ev.aside.selectHint')}
              />
              {selected && (
                <div className="space-y-2.5 rounded-xl border border-line bg-base2 p-4 text-[12px]">
                  <p className="flex justify-between">
                    <span className="text-muted">{t('ev.aside.painScore')}</span>
                    <span className="tnum font-semibold text-ink">{selected.pain_score.toFixed(0)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted">{t('ev.aside.evidenceReviews')}</span>
                    <span className="tnum font-semibold text-ink">{selected.evidence_review_ids.length}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted">{t('ev.aside.avgRating')}</span>
                    <span className="tnum font-semibold text-ink">{selected.avg_rating.toFixed(2)}★</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-muted">{t('ev.aside.shareNegative')}</span>
                    <span className="tnum font-semibold text-ink">{(selected.share * 100).toFixed(1)}%</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
