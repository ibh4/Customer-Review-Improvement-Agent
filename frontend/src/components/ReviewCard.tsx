import { useEffect, useMemo, useState } from 'react'
import { translateText } from '../api/client'
import type { Review } from '../types'
import { useI18n } from '../i18n'
import { HelpfulVotes, Stars } from './ui'

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** highlight keyword hits (case-insensitive) inside review text */
function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  const segments = useMemo(() => {
    const valid = keywords.filter((k) => k && k.trim().length > 1)
    if (valid.length === 0) return [text]
    // longest first so multi-word phrases win over their parts
    const sorted = [...new Set(valid)].sort((a, b) => b.length - a.length)
    const regex = new RegExp(`(${sorted.map(escapeRegExp).join('|')})`, 'gi')
    return text.split(regex)
  }, [text, keywords])

  const isKeyword = (s: string) =>
    keywords.some((k) => k.toLowerCase() === s.toLowerCase())

  return (
    <>
      {segments.map((seg, i) =>
        isKeyword(seg) ? (
          <mark key={i} className="kw">
            {seg}
          </mark>
        ) : (
          <span key={i}>{seg}</span>
        )
      )}
    </>
  )
}

export function ReviewCard({
  review,
  keywords,
  /** pain color — tints keyword highlights with the stable pain palette */
  accent,
  /** click-to-inspect (evidence explorer) */
  onClick,
  active = false,
  compact = false,
}: {
  review: Review
  keywords?: string[]
  accent?: string
  onClick?: () => void
  active?: boolean
  compact?: boolean
}) {
  const { lang, t } = useI18n()
  /* 中文模式：自动翻译评论标题/正文（后端 LLM→gtx，失败保持原文） */
  const needsZh = lang === 'zh'
  const [zhTitle, setZhTitle] = useState<string | null>(null)
  const [zhText, setZhText] = useState<string | null>(null)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    if (!needsZh) return
    let cancelled = false
    translateText(review.review_text).then((r) => { if (!cancelled && r) setZhText(r) })
    if (review.review_title) {
      translateText(review.review_title).then((r) => { if (!cancelled && r) setZhTitle(r) })
    }
    return () => { cancelled = true }
  }, [needsZh, review.review_id, review.review_text, review.review_title])

  useEffect(() => { setShowOriginal(false) }, [lang])

  const translated = needsZh && zhText && !showOriginal
  const displayTitle = translated && zhTitle ? zhTitle : review.review_title
  const displayText = translated ? zhText! : review.review_text

  const date = new Date(review.timestamp * 1000).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const style = accent ? ({ '--kw-bg': accent + '1F', '--kw-fg': accent } as React.CSSProperties) : undefined
  const Wrapper = onClick ? 'button' : 'article'

  return (
    <Wrapper
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      style={style}
      className={`block w-full rounded-xl border bg-card p-4 text-left shadow-sm transition ${
        active
          ? 'border-primary/70 ring-2 ring-primary/15'
          : 'border-line hover:border-line2/80'
      } ${onClick ? 'cursor-pointer' : ''} ${compact ? 'py-3' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Stars rating={review.rating} />
        <span className="tnum text-xs font-medium text-muted">{review.rating.toFixed(1)}</span>
        {review.matched_pain && (
          <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
            {review.matched_pain}
          </span>
        )}
        <span className="ml-auto text-xs text-muted">{date}</span>
      </div>
      <h4 className="mt-2 text-sm font-semibold text-ink">{displayTitle}</h4>
      <p className={`mt-1.5 text-sm leading-relaxed text-muted ${compact ? 'line-clamp-3' : ''}`}>
        <HighlightedText text={displayText} keywords={keywords ?? []} />
      </p>
      {(needsZh && zhText) && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); setShowOriginal((v) => !v) }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setShowOriginal((v) => !v) } }}
          className="mt-1.5 inline-block cursor-pointer text-[11px] font-medium text-primary/80 hover:text-primary"
        >
          {showOriginal ? t('rc.showTranslation') : t('rc.showOriginal')}
        </span>
      )}
      <div className="mt-3 flex items-center justify-between">
        <HelpfulVotes count={review.helpful_vote} />
        <span className="tnum text-[11px] text-muted/70">{review.review_id}</span>
      </div>
    </Wrapper>
  )
}
