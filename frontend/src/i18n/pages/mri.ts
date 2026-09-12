/**
 * Product MRI page dictionary.
 */
import { registerDict } from '../core'

registerDict({
  zh: {
    /* ---------- hero ---------- */
    'mri.heroEyebrow': '产品智能',
    'mri.heroTitle1': '看透客户的不满。',
    'mri.heroTitle2': '造他们真正想要的下一代产品。',
    'mri.statAnalyzing': '已分析',
    'mri.statReviews': '条客户评论',
    'mri.statClusters': '个关键痛点聚类',
    'mri.statOpportunities': '个产品进化机会',
    'mri.llmEnhanced': 'LLM 增强',
    'mri.ruleBased': '规则模式',
    'mri.negativeReviewsChip': '{n} 条差评',

    /* ---------- KPI cards ---------- */
    'mri.kpiHealth': '产品健康度',
    'mri.healthGood': '良好',
    'mri.healthModerate': '中等',
    'mri.healthAtRisk': '有风险',
    'mri.kpiHealthMicro': '月度 · 基于评论证据推导',
    'mri.kpiPainIndex': '痛点指数',
    'mri.kpiPainSub': '{n} 个聚类中的最高值',
    'mri.kpiPainMicro': '各聚类痛点分数',
    'mri.kpiAvgRating': '平均评分',
    'mri.kpiAvgRatingSub': '满分 5 星',
    'mri.kpiAvgRatingMicro': '月度趋势',
    'mri.kpiReviews': '已分析评论',
    'mri.kpiReviewsSub': '{n} 条 · {kind}数据',
    'mri.demoData': '演示',
    'mri.realData': '真实',
    'mri.kpiReviewsMicro': '月度评论量',
    'mri.kpiCritical': '严重痛点',
    'mri.kpiCriticalSub': '痛点分数 ≥ 60（推导值）',
    'mri.kpiCriticalMicro': '{c} / {n} 个聚类',
    'mri.kpiCoverage': '证据覆盖率',
    'mri.kpiCoverageSub': '有证据支撑的差评',
    'mri.kpiCoverageMicro': '基于评论证据推导',

    /* ---------- AI insight ---------- */
    'mri.insightTop': '最强烈的客户信号是「{name}」（痛点分数 {score}），由 {n} 条差评支撑 —— 占该商品全部投诉的 {pct}%。',
    'mri.insightTag': 'AI 洞察 · 产品体检',

    /* ---------- pain distribution ---------- */
    'mri.distTitle': '痛点分布',
    'mri.distDesc': '各聚类痛点分数 · 点击柱形可在痛点星系中打开',
    'mri.emptyPains': '未检测到痛点',
    'mri.emptyPainsHint': '该商品没有差评聚类。',

    /* ---------- review dynamics ---------- */
    'mri.dynTitle': '评论动态',
    'mri.dynDesc': '月度评论量、平均评分与差评占比',
    'mri.dynAria': '评论动态模式',
    'mri.dynVolume': '评论量',
    'mri.dynRating': '评分',
    'mri.dynNegative': '差评占比',
    'mri.dynYVolume': '月评论量',
    'mri.dynYRating': '平均评分',
    'mri.dynYNegative': '1–3★ 占比',
    'mri.ttReviews': '评论数',
    'mri.ttAvgRating': '平均评分',
    'mri.ttNegShare': '1–3★ 占比',
    'mri.dynUnavailable': '数据不可用',
    'mri.dynUnavailableHint': '该商品的评论时间戳不足以生成月度趋势 —— 未做任何数据合成。',

    /* ---------- 3D landscape ---------- */
    'mri.landTitle': '3D 客户痛点地形图',
    'mri.landDesc': '频率 × 严重度 × 有用度 · 气泡大小 = 评论数 · 左键拖拽旋转 / 右键平移 / 滚轮缩放',
    'mri.toggle2d3d': '2D / 3D 切换',
    'mri.no3dTitle': '此设备不支持 3D —— 已切换为 2D',
    'mri.glFallback':
      '当前环境不支持 WebGL 3D（常见于远程桌面、虚拟机或浏览器关闭硬件加速），已自动切换为 2D 视图，所有数据与交互不受影响。如需 3D：在浏览器设置中开启「硬件加速」后刷新重试。',
    'mri.autoRotate': '自动旋转',
    'mri.rotate': '旋转',
    'mri.resetCamera': '重置视角',
    'mri.reset': '重置',
    'mri.emptyMap': '暂无痛点可映射',

    /* ---------- rating distribution ---------- */
    'mri.ratingTitle': '评分分布',
    'mri.ratingDesc': '客户如何评价此商品',
    'mri.radarTitle': '缺点评论占比',
    'mri.radarDesc': '各痛点评论占差评的比例 · 点击尖刺查看证据',
    'mri.radarShare': '差评占比',
    'mri.radarReviews': '评论数',
    'mri.positive': '正面 {v}',
    'mri.neutral': '中性 {v}',
    'mri.negative': '负面 {v}',
    'mri.viewRatingReviews': '在证据浏览器中查看 {k}★ 评论',
    'mri.clickHint': '点击 1–3★ 行可在证据浏览器中打开对应评论',

    /* ---------- evidence strength ---------- */
    'mri.evidenceTitle': '证据强度',
    'mri.evidenceDesc': '每个聚类背后的支撑评论',
    'mri.viewEvidence': '查看证据',
    'mri.evidenceCount': '{n} 条证据',

    /* ---------- error / footer ---------- */
    'mri.errorTitle': '无法加载最新分析',
    'mri.errorNoData': '暂无分析数据',
    'mri.footer': '来源：{source} · 分析生成于 {time} · 商品 {id}',
    'mri.footerDemo': '合成演示数据集',
    'mri.footerReal': "Amazon Reviews '23（真实客户评论）",
  },
  en: {
    /* ---------- hero ---------- */
    'mri.heroEyebrow': 'Product Intelligence',
    'mri.heroTitle1': 'Know what customers hate.',
    'mri.heroTitle2': 'Build what they want next.',
    'mri.statAnalyzing': 'Analyzing',
    'mri.statReviews': 'customer reviews',
    'mri.statClusters': 'critical pain clusters detected',
    'mri.statOpportunities': 'product evolution opportunities',
    'mri.llmEnhanced': 'LLM-enhanced',
    'mri.ruleBased': 'Rule-based',
    'mri.negativeReviewsChip': '{n} negative reviews',

    /* ---------- KPI cards ---------- */
    'mri.kpiHealth': 'Product Health',
    'mri.healthGood': 'Good',
    'mri.healthModerate': 'Moderate',
    'mri.healthAtRisk': 'At risk',
    'mri.kpiHealthMicro': 'monthly · derived from review evidence',
    'mri.kpiPainIndex': 'Pain Index',
    'mri.kpiPainSub': 'max across {n} clusters',
    'mri.kpiPainMicro': 'pain score by cluster',
    'mri.kpiAvgRating': 'Avg Rating',
    'mri.kpiAvgRatingSub': 'out of 5 stars',
    'mri.kpiAvgRatingMicro': 'monthly trend',
    'mri.kpiReviews': 'Reviews Analyzed',
    'mri.kpiReviewsSub': '{n} total · {kind} data',
    'mri.demoData': 'demo',
    'mri.realData': 'real',
    'mri.kpiReviewsMicro': 'monthly volume',
    'mri.kpiCritical': 'Critical Pain Points',
    'mri.kpiCriticalSub': 'pain score ≥ 60 (derived)',
    'mri.kpiCriticalMicro': '{c} of {n} clusters',
    'mri.kpiCoverage': 'Evidence Coverage',
    'mri.kpiCoverageSub': 'negative reviews w/ evidence',
    'mri.kpiCoverageMicro': 'derived from review evidence',

    /* ---------- AI insight ---------- */
    'mri.insightTop':
      'The strongest customer signal is {name} (pain score {score}), backed by {n} negative reviews — {pct}% of all complaints for this product.',
    'mri.insightTag': 'AI Insight · Product MRI',

    /* ---------- pain distribution ---------- */
    'mri.distTitle': 'Pain Distribution',
    'mri.distDesc': 'Pain score by cluster · click a bar to open it in Pain Galaxy',
    'mri.emptyPains': 'No pain points detected',
    'mri.emptyPainsHint': 'This product has no negative review clusters.',

    /* ---------- review dynamics ---------- */
    'mri.dynTitle': 'Review Dynamics',
    'mri.dynDesc': 'Monthly review volume, average rating and negative share',
    'mri.dynAria': 'Review dynamics mode',
    'mri.dynVolume': 'Volume',
    'mri.dynRating': 'Rating',
    'mri.dynNegative': 'Negative Share',
    'mri.dynYVolume': 'Reviews / month',
    'mri.dynYRating': 'Avg rating',
    'mri.dynYNegative': '1–3★ share',
    'mri.ttReviews': 'Reviews',
    'mri.ttAvgRating': 'Avg rating',
    'mri.ttNegShare': '1–3★ share',
    'mri.dynUnavailable': 'Data unavailable',
    'mri.dynUnavailableHint':
      'This product has insufficient review timestamps for a monthly trend — nothing is synthesized.',

    /* ---------- 3D landscape ---------- */
    'mri.landTitle': '3D Customer Pain Landscape',
    'mri.landDesc':
      'Frequency × severity × helpfulness · bubble size = review count · drag to rotate, right-drag to pan, scroll to zoom',
    'mri.toggle2d3d': '2D / 3D toggle',
    'mri.no3dTitle': '3D unavailable on this device — using 2D',
    'mri.glFallback':
      'WebGL 3D is unavailable here (common on remote desktops, VMs, or with browser hardware acceleration off). Switched to the 2D view automatically — all data and interactions are unaffected. For 3D, enable "Hardware acceleration" in browser settings and reload.',
    'mri.autoRotate': 'Auto rotate',
    'mri.rotate': 'Rotate',
    'mri.resetCamera': 'Reset camera',
    'mri.reset': 'Reset',
    'mri.emptyMap': 'No pain points to map',

    /* ---------- rating distribution ---------- */
    'mri.ratingTitle': 'Rating Distribution',
    'mri.ratingDesc': 'How customers rate this product',
    'mri.radarTitle': 'Pain Share Radar',
    'mri.radarDesc': 'Share of negative reviews per pain point · click a spike for evidence',
    'mri.radarShare': 'Negative share',
    'mri.radarReviews': 'Reviews',
    'mri.positive': 'Positive {v}',
    'mri.neutral': 'Neutral {v}',
    'mri.negative': 'Negative {v}',
    'mri.viewRatingReviews': 'View {k}★ reviews in Evidence Explorer',
    'mri.clickHint': 'click 1–3★ rows to open them in Evidence Explorer',

    /* ---------- evidence strength ---------- */
    'mri.evidenceTitle': 'Evidence Strength',
    'mri.evidenceDesc': 'Supporting reviews behind each cluster',
    'mri.viewEvidence': 'View evidence',
    'mri.evidenceCount': '{n} evidence',

    /* ---------- error / footer ---------- */
    'mri.errorTitle': 'Unable to load latest analysis',
    'mri.errorNoData': 'No analysis data',
    'mri.footer': 'Source: {source} · analysis generated {time} · product {id}',
    'mri.footerDemo': 'synthetic demo dataset',
    'mri.footerReal': "Amazon Reviews '23 (real customer reviews)",
  },
})
