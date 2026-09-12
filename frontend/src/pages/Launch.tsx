import { useMemo, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { useAnalysis } from '../hooks/useAnalysis'
import type { Listing } from '../types'
import { AIInsight, ChartCard } from '../components/ChartCard'
import { EvidenceDrawer } from '../components/EvidenceDrawer'
import { ProductVisual, productImageUrl } from '../components/ProductVisual'
import { ErrorCard, SkeletonBlock, Stars } from '../components/ui'
import { painColor } from '../charts/theme'
import { useI18n, painLabel } from '../i18n'
import '../i18n/pages/launch'

type Tab = 'listing' | 'points' | 'faq' | 'image' | 'campaign'

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'listing', labelKey: 'ln.tab.listing' },
  { key: 'points', labelKey: 'ln.tab.points' },
  { key: 'faq', labelKey: 'ln.tab.faq' },
  { key: 'image', labelKey: 'ln.tab.image' },
  { key: 'campaign', labelKey: 'ln.tab.campaign' },
]

const FRAME_TITLE_KEYS = [
  'ln.frame.hero',
  'ln.frame.problem',
  'ln.frame.proof',
  'ln.frame.usage',
  'ln.frame.comparison',
]

function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }
  return (
    <button
      type="button"
      onClick={onCopy}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
        copied
          ? 'border-success/50 bg-success/10 text-success'
          : 'border-line2 bg-cardhover text-muted hover:border-primary hover:text-ink'
      }`}
    >
      {copied ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="9" y="9" width="11" height="11" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15V5a2 2 0 012-2h10" />
        </svg>
      )}
      {copied ? t('ln.copied') : (label ?? t('ln.copy'))}
    </button>
  )
}

function BulletLine({ text }: { text: string }) {
  const { t } = useI18n()
  const solvedMatch = /^\[SOLVED:\s*(.+?)\]\s*(.*)$/.exec(text)
  return (
    <li className="flex items-start gap-2.5 rounded-lg border border-line bg-base2 px-3.5 py-3">
      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        {t('ln.solvedBadge', { issue: solvedMatch ? solvedMatch[1] : t('ln.issueFallback') })}
      </span>
      <span className="text-[13px] leading-relaxed text-muted">{solvedMatch ? solvedMatch[2] : text}</span>
    </li>
  )
}

function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="space-y-2">
      {items.map((f, i) => {
        const open = openIdx === i
        return (
          <div key={i} className={`overflow-hidden rounded-lg border transition ${open ? 'border-primary/40 bg-base/60' : 'border-line bg-base2'}`}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className={`text-[13px] font-medium ${open ? 'text-primary' : 'text-ink'}`}>{f.q}</span>
              <svg
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open && <p className="px-4 pb-4 text-[13px] leading-relaxed text-muted">{f.a}</p>}
          </div>
        )
      })}
    </div>
  )
}

export function Launch() {
  const { t } = useI18n()
  const { analysis, loading, error, reload } = useAnalysis()
  const [tab, setTab] = useState<Tab>('listing')
  const [drawerPainId, setDrawerPainId] = useState<string | null>(null)

  const sortedPains = useMemo(
    () => (analysis ? [...analysis.pain_points].sort((a, b) => b.pain_score - a.pain_score) : []),
    [analysis]
  )
  const topPain = sortedPains[0] ?? null
  const drawerPain = useMemo(
    () => analysis?.pain_points.find((p) => p.pain_point_id === drawerPainId) ?? null,
    [analysis, drawerPainId]
  )

  /* match each selling point to a pain point by keyword overlap (honest mapping) */
  const pointCards = useMemo(() => {
    if (!analysis) return []
    return analysis.product_v2.selling_points.map((sp) => {
      const low = sp.toLowerCase()
      const pain = sortedPains.find(
        (p) =>
          low.includes(p.name.toLowerCase()) ||
          p.display_name.toLowerCase().split(/\s+/).some((w) => w.length > 4 && low.includes(w)) ||
          p.keywords.some((k) => k.length > 3 && low.includes(k.toLowerCase()))
      )
      return { text: sp, pain, evidence: pain ? pain.evidence_review_ids.length : 0 }
    })
  }, [analysis, sortedPains])

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-12" />
        <SkeletonBlock className="h-96" />
      </div>
    )
  }

  if (error || !analysis) {
    return <ErrorCard title={t('ln.errorTitle')} message={error ?? t('ln.errorNoData')} onRetry={reload} />
  }

  const listing: Listing = analysis.listing
  const audience = topPain && analysis.root_causes[topPain.name]?.affected_users
  const evidenceTotal = sortedPains.reduce((s, p) => s + p.evidence_review_ids.length, 0)

  return (
    <div className="space-y-4 fade-in">
      {/* ---------------- hero ---------------- */}
      <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-card">
        <div className="flex flex-col-reverse items-stretch gap-5 md:flex-row md:items-center">
          <div className="min-w-0 flex-1 px-6 py-6 md:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-success">{t('ln.hero.eyebrow')}</p>
            <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-ink">
              {t('ln.hero.title')}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {t('ln.hero.descA')}<span className="tnum font-medium text-ink">{analysis.stats.total_reviews.toLocaleString()}</span>{t('ln.hero.descB')}<span className="tnum font-medium text-ink">{evidenceTotal}</span>{t('ln.hero.descC')}
              <span className="font-mono text-[12px]">{listing.source}</span>
            </p>
            <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-line bg-base2 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t('ln.hero.positioning')}</p>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink/90">{analysis.product_v2.positioning}</p>
              </div>
              <div className="rounded-xl border border-line bg-base2 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t('ln.hero.audience')}</p>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink/90">{audience ?? t('ln.hero.audienceFallback')}</p>
              </div>
              <div className="rounded-xl border border-line bg-base2 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{t('ln.hero.topPoint')}</p>
                <p className="mt-1 line-clamp-3 text-[12px] leading-relaxed text-ink/90">
                  {analysis.product_v2.selling_points[0] ?? '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-center px-6 pb-2 pt-6 md:py-7 md:pl-0 md:pr-8">
            <ProductVisual
              category={analysis.category}
              title={analysis.product_title}
              imageUrl={productImageUrl(analysis.product_id)}
              className="h-44 w-40"
              label={`ASIN ${analysis.product_id}`}
            />
          </div>
        </div>
      </section>

      <AIInsight
        tag={t('ln.aiTag')}
        text={
          topPain
            ? t('ln.aiText', { pain: painLabel(topPain), n: topPain.evidence_review_ids.length })
            : ''
        }
      />

      {/* ---------------- tabs ---------------- */}
      <div className="seg flex-wrap" role="tablist" aria-label={t('ln.tabsAria')}>
        {TABS.map((tb) => (
          <button key={tb.key} type="button" data-active={tab === tb.key} onClick={() => setTab(tb.key)} role="tab">
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {/* ---------------- listing ---------------- */}
      {tab === 'listing' && (
        <div className="space-y-4">
          {/* ecommerce-style listing preview */}
          <section className="rounded-2xl border border-line bg-card shadow-card">
            <header className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold tracking-tight text-ink">{t('ln.preview.title')}</h2>
              <p className="mt-0.5 text-xs text-muted">{t('ln.preview.desc')}</p>
            </header>
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-[300px_1fr]">
              <div className="space-y-3">
                <ProductVisual
                  category={analysis.category}
                  title={analysis.product_title}
                  imageUrl={productImageUrl(analysis.product_id)}
                  className="h-72 w-full"
                  float={false}
                  label={t('ln.v2Hero')}
                />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <ProductVisual
                      key={i}
                      category={analysis.category}
                      title={analysis.product_title}
                      imageUrl={productImageUrl(analysis.product_id)}
                      className="h-20 w-full !rounded-lg"
                      float={false}
                    />
                  ))}
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">{listing.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2.5">
                  <Stars rating={analysis.stats.avg_rating} />
                  <span className="tnum text-[13px] font-medium text-ink">{analysis.stats.avg_rating.toFixed(2)}</span>
                  <span className="tnum text-xs text-muted">
                    {t('ln.ratingsBase', { n: analysis.stats.total_reviews.toLocaleString() })}
                  </span>
                </div>
                <div className="mt-3 rounded-lg border border-line bg-base2 px-3.5 py-2.5">
                  <span className="text-[13px] font-medium text-muted">{t('ln.priceLabel')}</span>
                  <span className="text-[13px] font-semibold text-faint">{t('ln.priceNotModeled')}</span>
                  <span className="ml-2 text-[11px] text-faint">{t('ln.priceNote')}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {listing.bullets.map((b, i) => (
                    <BulletLine key={i} text={b} />
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CopyButton text={listing.title} label={t('ln.copyTitle')} />
                  <CopyButton text={listing.bullets.map((b) => `• ${b}`).join('\n')} label={t('ln.copyBullets')} />
                </div>
              </div>
            </div>
          </section>

          {/* raw title block */}
          <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t('ln.listingTitle')}</p>
                <h2 className="mt-2 text-[15px] font-semibold leading-snug tracking-tight text-ink">{listing.title}</h2>
                <p className="tnum mt-2 text-xs text-muted/70">{t('ln.charsCount', { n: listing.title.length })}</p>
              </div>
              <CopyButton text={listing.title} />
            </div>
          </section>
        </div>
      )}

      {/* ---------------- selling points ---------------- */}
      {tab === 'points' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pointCards.map((c, i) => {
            const color = c.pain ? painColor(c.pain.name) : '#4F7CFF'
            return (
              <button
                key={i}
                type="button"
                disabled={!c.pain}
                onClick={() => c.pain && setDrawerPainId(c.pain.pain_point_id)}
                className={`group flex flex-col rounded-2xl border border-line bg-card p-5 text-left shadow-card transition ${
                  c.pain ? 'hover:border-primary/50 hover:shadow-pop' : 'cursor-default'
                }`}
              >
                <span className="tnum text-[28px] font-bold leading-none text-line2 transition group-hover:text-primary/40">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-ink">{c.text}</h3>
                <div className="mt-auto pt-4">
                  {c.pain ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      {t('ln.points.backed', { n: c.evidence, pain: painLabel(c.pain) })}
                      <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                    </span>
                  ) : (
                    <span className="text-[11px] text-faint">{t('ln.points.aligned')}</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ---------------- FAQ ---------------- */}
      {tab === 'faq' && (
        <ChartCard
          title={t('ln.faq.title')}
          description={t('ln.faq.desc')}
          provenance={{ source: analysis.data_source, reviews: analysis.stats.total_reviews }}
        >
          {listing.faq.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t('ln.faq.empty')}</p>
          ) : (
            <div className="px-3 pb-2">
              <FaqAccordion items={listing.faq} />
            </div>
          )}
        </ChartCard>
      )}

      {/* ---------------- image strategy storyboard ---------------- */}
      {tab === 'image' && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-ink">{t('ln.image.title')}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {t('ln.image.desc')}
              </p>
            </div>
            <CopyButton
              text={listing.main_image_strategy
                .map(
                  (s, i) =>
                    `${t('ln.frame.copyTag', { n: String(i + 1).padStart(2, '0') })} · ${t(FRAME_TITLE_KEYS[i] ?? 'ln.frame.supportingCopy')}\n${s}`
                )
                .join('\n\n')}
              label={t('ln.copyStoryboard')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {listing.main_image_strategy.map((step, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-card">
                <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-base2 via-card to-tint">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full border border-line/70" />
                  <ProductVisual
                    category={analysis.category}
                    title={analysis.product_title}
                    imageUrl={productImageUrl(analysis.product_id)}
                    className="h-28 w-24 !rounded-none !border-0 !bg-transparent"
                    float={false}
                  />
                  <span className="absolute left-3 top-3 rounded-md border border-line2 bg-card/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    {t('ln.frame.badge', { n: String(i + 1).padStart(2, '0') })}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-[13px] font-semibold tracking-tight text-ink">{t(FRAME_TITLE_KEYS[i] ?? 'ln.frame.supporting')}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{step}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------- campaign ---------------- */}
      {tab === 'campaign' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-4">
            {[
              {
                tag: t('ln.campaign.problem'),
                color: '#EA5B5B',
                body: topPain
                  ? t('ln.campaign.problemBody', {
                      pain: painLabel(topPain),
                      score: topPain.pain_score.toFixed(0),
                      n: topPain.review_count,
                    })
                  : '—',
              },
              {
                tag: t('ln.campaign.evidence'),
                color: '#19B5D1',
                body: topPain
                  ? t('ln.campaign.evidenceBody', {
                      n: topPain.evidence_review_ids.length,
                      avg: topPain.avg_rating.toFixed(2),
                    })
                  : '—',
              },
              {
                tag: t('ln.campaign.solution'),
                color: '#24B47E',
                body: analysis.product_v2.parameters[0]?.recommended_state ?? analysis.product_v2.positioning,
              },
              {
                tag: t('ln.campaign.message'),
                color: '#4F7CFF',
                body: listing.marketing_message,
              },
            ].map((s, i) => (
              <div key={s.tag} className="relative flex flex-col rounded-2xl border border-line bg-card p-5 shadow-card">
                <span className="absolute -right-2 top-1/2 hidden -translate-y-1/2 text-line2 md:block">
                  {i < 3 ? <ArrowRight className="h-5 w-5 bg-card" /> : null}
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: s.color }}>
                  {s.tag}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink/90">{s.body}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-line bg-card p-6 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t('ln.marketingMessage')}</p>
                <blockquote className="relative mt-3 rounded-lg border-l-2 border-primary bg-base2 px-5 py-4">
                  <span className="absolute -top-1 left-3 select-none text-3xl leading-none text-primary/40">“</span>
                  <p className="text-[13px] font-medium italic leading-relaxed text-ink">{listing.marketing_message}</p>
                </blockquote>
              </div>
              <CopyButton text={listing.marketing_message} label={t('ln.copyMessage')} />
            </div>
            <div className="mt-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{t('ln.keyHooks')}</p>
              <div className="flex flex-wrap gap-2">
                {analysis.product_v2.selling_points.map((sp, i) => (
                  <span key={i} className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                    {sp}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      <EvidenceDrawer open={drawerPainId !== null} onClose={() => setDrawerPainId(null)} painPoint={drawerPain ?? undefined} />
    </div>
  )
}
