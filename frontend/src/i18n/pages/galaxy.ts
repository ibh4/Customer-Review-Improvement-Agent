/**
 * Galaxy page dictionary - Customer Pain Galaxy (Galaxy.tsx).
 */
import { registerDict } from '../core'

registerDict({
  zh: {
    /* ---------- header ---------- */
    'galaxy.eyebrow': '客户痛点星系',
    'galaxy.title': '客户痛点星系',
    'galaxy.subtitle': '探索频率、严重度与证据的交汇点。',
    'galaxy.viewModeAria': '星系视图模式',
    'galaxy.view3d': '3D 星系',
    'galaxy.viewMatrix': '2D 矩阵',
    'galaxy.viewEvidence': '证据地图',
    'galaxy.aiTag': 'AI 洞察 · 痛点星系',

    /* ---------- AI insight ---------- */
    'galaxy.insight.spread': '没有单一聚类占据主导——痛点在频率与严重度上分布较为均匀。',
    'galaxy.insight.one': '一个痛点聚类兼具高频率与高严重度：{names}——建议优先修复。',
    'galaxy.insight.many': '{n} 个痛点聚类兼具高频率与高严重度：{names}——建议优先修复。',
    'galaxy.insight.sep': '、',

    /* ---------- error ---------- */
    'galaxy.errorTitle': '星系暂不可用',
    'galaxy.errorNoData': '暂无分析数据',

    /* ---------- filter rail ---------- */
    'galaxy.filters': '筛选',
    'galaxy.reset': '重置',
    'galaxy.filter.minScore': '最低痛点分数',
    'galaxy.filter.minSeverity': '最低严重度',
    'galaxy.filter.minFrequency': '最低频率',
    'galaxy.filter.minEvidence': '最少证据数',
    'galaxy.filter.any': '不限',
    'galaxy.filter.rating': '聚类平均评分',
    'galaxy.rating.any': '任意评分',
    'galaxy.rating.mid': '≤ 3.5★（关键）',
    'galaxy.rating.low': '≤ 2.5★（严重）',
    'galaxy.filter.count': '已显示 {shown} / {total} 个聚类',

    /* ---------- center visualization ---------- */
    'galaxy.chart.3d': '3D 痛点星系',
    'galaxy.chart.matrix': '优先级矩阵',
    'galaxy.chart.3d.desc': '频率 × 严重度 × 有用度 · 气泡大小 = 评论数 · 拖拽可旋转',
    'galaxy.chart.matrix.desc': '频率 × 严重度 · 象限以轴中点划分',
    'galaxy.chart.evidence.desc': '痛点分数 × 证据评论 · 哪些问题既重要又有充分证据支撑',
    'galaxy.rotate': '旋转',
    'galaxy.sourceDemo': '演示数据',

    /* ---------- empty states ---------- */
    'galaxy.empty.noPains': '未检测到该商品的痛点',
    'galaxy.empty.filtered': '没有聚类符合筛选条件',
    'galaxy.empty.filteredHint': '放宽筛选阈值可查看更多痛点。',
    'galaxy.empty.select': '选择一个气泡',
    'galaxy.empty.selectHint': '点击任意痛点气泡查看详情。',

    /* ---------- right detail panel ---------- */
    'galaxy.selected.title': '选中的痛点',
    'galaxy.selected.rank': '排名 {rank} / {total} · {name}',
    'galaxy.metric.recency': '新近度',
    'galaxy.metric.reviewCount': '评论数',
    'galaxy.metric.avgRating': '平均评分',
    'galaxy.metric.evidenceReviews': '{n} 条评论',
    'galaxy.keywords': '关键词',
    'galaxy.rootCause': '根因：',
    'galaxy.scenario': '场景：',
    'galaxy.viewEvidenceBtn': '查看证据',
    'galaxy.openInExplorer': '在证据浏览器中打开',
  },
  en: {
    /* ---------- header ---------- */
    'galaxy.eyebrow': 'Customer Pain Galaxy',
    'galaxy.title': 'Customer Pain Galaxy',
    'galaxy.subtitle': 'Explore where frequency, severity and evidence converge.',
    'galaxy.viewModeAria': 'Galaxy view mode',
    'galaxy.view3d': '3D Galaxy',
    'galaxy.viewMatrix': '2D Matrix',
    'galaxy.viewEvidence': 'Evidence Map',
    'galaxy.aiTag': 'AI Insight · Pain Galaxy',

    /* ---------- AI insight ---------- */
    'galaxy.insight.spread': 'No single cluster dominates — pain is spread evenly across frequency and severity.',
    'galaxy.insight.one': 'One pain cluster combines high frequency and high severity: {names} — fix these first.',
    'galaxy.insight.many': '{n} pain clusters combine high frequency and high severity: {names} — fix these first.',
    'galaxy.insight.sep': ' and ',

    /* ---------- error ---------- */
    'galaxy.errorTitle': 'Galaxy unavailable',
    'galaxy.errorNoData': 'No analysis data',

    /* ---------- filter rail ---------- */
    'galaxy.filters': 'Filters',
    'galaxy.reset': 'Reset',
    'galaxy.filter.minScore': 'Min Pain Score',
    'galaxy.filter.minSeverity': 'Min Severity',
    'galaxy.filter.minFrequency': 'Min Frequency',
    'galaxy.filter.minEvidence': 'Min Evidence',
    'galaxy.filter.any': 'any',
    'galaxy.filter.rating': 'Cluster Avg Rating',
    'galaxy.rating.any': 'Any rating',
    'galaxy.rating.mid': '≤ 3.5★ (critical)',
    'galaxy.rating.low': '≤ 2.5★ (severe)',
    'galaxy.filter.count': '{shown} of {total} clusters shown',

    /* ---------- center visualization ---------- */
    'galaxy.chart.3d': '3D Pain Galaxy',
    'galaxy.chart.matrix': 'Priority Matrix',
    'galaxy.chart.3d.desc': 'Frequency × severity × helpfulness · bubble size = review count · drag to rotate',
    'galaxy.chart.matrix.desc': 'Frequency × severity · quadrants split at axis midpoints',
    'galaxy.chart.evidence.desc': 'Pain score × evidence reviews · which problems matter AND are well evidenced',
    'galaxy.rotate': 'Rotate',
    'galaxy.sourceDemo': 'demo data',

    /* ---------- empty states ---------- */
    'galaxy.empty.noPains': 'No pain points detected for this product',
    'galaxy.empty.filtered': 'No clusters match the filters',
    'galaxy.empty.filteredHint': 'Relax the filter thresholds to see more pain points.',
    'galaxy.empty.select': 'Select a bubble',
    'galaxy.empty.selectHint': 'Click any pain point bubble to inspect it.',

    /* ---------- right detail panel ---------- */
    'galaxy.selected.title': 'Selected Pain Point',
    'galaxy.selected.rank': 'Rank #{rank} of {total} · {name}',
    'galaxy.metric.recency': 'Recency',
    'galaxy.metric.reviewCount': 'Review Count',
    'galaxy.metric.avgRating': 'Avg Rating',
    'galaxy.metric.evidenceReviews': '{n} reviews',
    'galaxy.keywords': 'Keywords',
    'galaxy.rootCause': 'Root cause: ',
    'galaxy.scenario': 'Scenario: ',
    'galaxy.viewEvidenceBtn': 'View Evidence',
    'galaxy.openInExplorer': 'Open in Evidence Explorer',
  },
})
