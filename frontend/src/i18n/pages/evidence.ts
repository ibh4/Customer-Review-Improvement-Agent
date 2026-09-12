/**
 * Evidence Explorer page dictionary.
 */
import { registerDict } from '../core'

registerDict({
  zh: {
    /* ---------- sort / rating filters ---------- */
    'ev.sort.relevance': '相关度',
    'ev.sort.helpful': '有用度',
    'ev.sort.newest': '最新',
    'ev.sort.oldest': '最早',
    'ev.rating.any': '全部评分',
    'ev.rating.1': '1★',
    'ev.rating.2': '≤ 2★',
    'ev.rating.3': '≤ 3★',
    'ev.rating.45': '4–5★',

    /* ---------- inspector ---------- */
    'ev.inspector.title': '评论证据',
    'ev.inspector.close': '关闭详情面板',
    'ev.inspector.rating': '评分',
    'ev.inspector.date': '日期',
    'ev.inspector.helpfulness': '有用度',
    'ev.inspector.votes': '{n} 票',
    'ev.inspector.strength': '证据强度',
    'ev.inspector.strengthTip':
      '推导证据分：45% 评分严重度 + 30% 归一化有用度 + 25% 关键词覆盖率 · 由评论证据推导，非模型概率',
    'ev.inspector.strengthNote': '由评论证据推导 — 评分严重度、有用度与关键词覆盖率。',
    'ev.inspector.signal': '识别信号',
    'ev.inspector.painPoint': '痛点',
    'ev.inspector.keywordMatches': '关键词命中',
    'ev.inspector.keywordOf': '{hits} / {total}',
    'ev.inspector.source': '来源：{source} · 已验证客户评论。',
    'ev.inspector.sourceSynthetic': '合成演示数据集',
    'ev.inspector.sourceAmazon': "Amazon Reviews '23",

    /* ---------- header ---------- */
    'ev.title.eyebrow': '证据探索',
    'ev.title.h1': '客户证据',
    'ev.head.evidenceReviews': '条证据评论',
    'ev.head.avg': '平均',
    'ev.title.noneSelected': '未选择痛点',
    'ev.viewFix': '查看产品改进',

    /* ---------- ai insight ---------- */
    'ev.insightTag': 'AI 洞察 · 证据',
    'ev.insight':
      '“{label}”由 {n} 条证据评论支撑 · 其中 {voted} 条被其他客户投票认可（平均 {avg} 票）— 这是经过验证的客户之声，非模型输出。',

    /* ---------- left pain list ---------- */
    'ev.list.title': '痛点 · 按分数',
    'ev.list.counts': '{n} 条证据 · {m} 条评论',

    /* ---------- timeline ---------- */
    'ev.timeline.title': '证据时间线',
    'ev.timeline.sub': '每月评论量 · 颜色越深 1–3★ 占比越高 · 点击月份筛选',
    'ev.timeline.emptyNoData': '暂无证据评论',
    'ev.timeline.emptyNoDataHint': '该痛点尚未加载支撑评论。',
    'ev.timeline.emptyShort': '数据不可用',
    'ev.timeline.emptyShortHint': '时间跨度不足两个月 — 时间线需要更长的范围。',
    'ev.timeline.tooltipReviews': '证据评论',
    'ev.timeline.tooltipAvg': '平均评分',
    'ev.timeline.tooltipNeg': '1–3★ 占比',
    'ev.timeline.clickFilter': '点击筛选该月评论',

    /* ---------- search / filter bar ---------- */
    'ev.search.placeholder': '搜索评论…',
    'ev.filter.rating': '评分筛选',
    'ev.filter.sort': '评论排序',

    /* ---------- review stream ---------- */
    'ev.stream.errorTitle': '证据加载失败',
    'ev.stream.empty': '未找到支撑证据',
    'ev.stream.emptyNoReviews': '分析流程未找到该痛点的匹配评论。',
    'ev.stream.emptyFiltered': '当前搜索 / 筛选条件下没有匹配评论，清除后可查看全部证据。',
    'ev.stream.count': '{n} / {total} 条证据评论',
    'ev.stream.countMonth': '{n} / {total} 条证据评论 · {month}',

    /* ---------- right aside ---------- */
    'ev.aside.title': '证据洞察',
    'ev.aside.select': '选择一条评论',
    'ev.aside.selectHint': '点击任意评论卡片查看其证据画像 — 评分严重度、有用度与关键词命中。',
    'ev.aside.painScore': '痛点分数',
    'ev.aside.evidenceReviews': '证据评论数',
    'ev.aside.avgRating': '平均评分',
    'ev.aside.shareNegative': '差评占比',

    /* ---------- error states ---------- */
    'ev.error.unavailable': '证据暂不可用',
    'ev.error.noAnalysis': '暂无分析数据',
  },
  en: {
    /* ---------- sort / rating filters ---------- */
    'ev.sort.relevance': 'Relevance',
    'ev.sort.helpful': 'Helpful',
    'ev.sort.newest': 'Newest',
    'ev.sort.oldest': 'Oldest',
    'ev.rating.any': 'All ratings',
    'ev.rating.1': '1★',
    'ev.rating.2': '≤ 2★',
    'ev.rating.3': '≤ 3★',
    'ev.rating.45': '4–5★',

    /* ---------- inspector ---------- */
    'ev.inspector.title': 'Review Evidence',
    'ev.inspector.close': 'Close inspector',
    'ev.inspector.rating': 'Rating',
    'ev.inspector.date': 'Date',
    'ev.inspector.helpfulness': 'Helpfulness',
    'ev.inspector.votes': '{n} votes',
    'ev.inspector.strength': 'Evidence Strength',
    'ev.inspector.strengthTip':
      'Derived evidence score: 45% rating severity + 30% normalized helpfulness + 25% keyword coverage · derived from review evidence, not a model probability',
    'ev.inspector.strengthNote': 'Derived from review evidence — rating severity, helpfulness and keyword coverage.',
    'ev.inspector.signal': 'Detected Signal',
    'ev.inspector.painPoint': 'Pain Point',
    'ev.inspector.keywordMatches': 'Keyword Matches',
    'ev.inspector.keywordOf': '{hits} of {total}',
    'ev.inspector.source': 'Source: {source} · verified customer review.',
    'ev.inspector.sourceSynthetic': 'synthetic demo dataset',
    'ev.inspector.sourceAmazon': "Amazon Reviews '23",

    /* ---------- header ---------- */
    'ev.title.eyebrow': 'Evidence Explorer',
    'ev.title.h1': 'Customer Evidence',
    'ev.head.evidenceReviews': 'evidence reviews',
    'ev.head.avg': 'avg',
    'ev.title.noneSelected': 'No pain point selected',
    'ev.viewFix': 'View Product Fix',

    /* ---------- ai insight ---------- */
    'ev.insightTag': 'AI Insight · Evidence',
    'ev.insight':
      '“{label}” is backed by {n} evidence reviews · {voted} were voted helpful by other customers (avg {avg} votes) — this is verified voice of customer, not model output.',

    /* ---------- left pain list ---------- */
    'ev.list.title': 'Pain Points · by score',
    'ev.list.counts': '{n} evidence · {m} reviews',

    /* ---------- timeline ---------- */
    'ev.timeline.title': 'Evidence Over Time',
    'ev.timeline.sub': 'Review volume per month · darker = higher 1–3★ share · click a month to filter',
    'ev.timeline.emptyNoData': 'No evidence reviews yet',
    'ev.timeline.emptyNoDataHint': 'This pain point has no supporting reviews loaded.',
    'ev.timeline.emptyShort': 'Data unavailable',
    'ev.timeline.emptyShortHint': 'Timestamps span less than two months — timeline needs a longer range.',
    'ev.timeline.tooltipReviews': 'Evidence reviews',
    'ev.timeline.tooltipAvg': 'Avg rating',
    'ev.timeline.tooltipNeg': '1–3★ share',
    'ev.timeline.clickFilter': 'click to filter reviews',

    /* ---------- search / filter bar ---------- */
    'ev.search.placeholder': 'Search reviews…',
    'ev.filter.rating': 'Rating filter',
    'ev.filter.sort': 'Sort reviews',

    /* ---------- review stream ---------- */
    'ev.stream.errorTitle': 'Failed to load evidence',
    'ev.stream.empty': 'No supporting evidence found',
    'ev.stream.emptyNoReviews': 'The analysis pipeline found no matching reviews for this pain point.',
    'ev.stream.emptyFiltered': 'No reviews match the current search / filters. Clear them to see all evidence.',
    'ev.stream.count': '{n} of {total} evidence reviews',
    'ev.stream.countMonth': '{n} of {total} evidence reviews · {month}',

    /* ---------- right aside ---------- */
    'ev.aside.title': 'Evidence Insight',
    'ev.aside.select': 'Select a review',
    'ev.aside.selectHint': 'Click any review card to inspect its evidence profile — rating severity, helpfulness and keyword matches.',
    'ev.aside.painScore': 'Pain score',
    'ev.aside.evidenceReviews': 'Evidence reviews',
    'ev.aside.avgRating': 'Avg rating',
    'ev.aside.shareNegative': 'Share of negative',

    /* ---------- error states ---------- */
    'ev.error.unavailable': 'Evidence unavailable',
    'ev.error.noAnalysis': 'No analysis data',
  },
})
