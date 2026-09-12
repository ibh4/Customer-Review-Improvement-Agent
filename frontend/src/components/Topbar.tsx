import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Bot,
  ChevronDown,
  MonitorPlay,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  X,
} from 'lucide-react'
import { api } from '../api/client'
import { useProduct } from '../context/ProductContext'
import { useUi } from '../context/UiContext'
import { useI18n } from '../i18n'
import '../i18n/pages/agent'
import { productLabel } from '../i18n/core'
import type { HealthStatus, ProductSummary } from '../types'
import { DataSourceBadge, LlmModeBadge, Spinner } from './ui'
import { StepIndicator } from './StepIndicator'
import { ProductVisual, productImageUrl } from './ProductVisual'

const PAGE_LABEL_KEYS: [string, string][] = [
  ['/galaxy', 'nav.painGalaxy'],
  ['/evidence', 'nav.evidence'],
  ['/evolution', 'nav.evolution'],
  ['/launch', 'nav.launch'],
]

function ProductOptionRow({ p, active }: { p: ProductSummary; active: boolean }) {
  const { t } = useI18n()
  return (
    <>
      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line">
        <ProductVisual category={p.category} title={p.product_title} imageUrl={productImageUrl(p.product_id)} float={false} className="!h-full !w-full !rounded-lg !border-0" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[13px] ${active ? 'font-medium text-primary' : 'text-ink'}`}>
          {productLabel(p.product_title, p.product_title_zh)}
        </span>
        <span className="tnum mt-0.5 block text-[11px] text-muted">
          {p.product_id} · {p.category} · {t('top.reviewsCount', { n: p.review_count.toLocaleString() })} · ★ {p.avg_rating.toFixed(2)}
          {p.is_demo_hero && <span className="ml-1.5 font-medium text-cyan">· hero</span>}
        </span>
      </span>
    </>
  )
}

export function Topbar() {
  const { products, currentProduct, currentProductId, setProduct, loading, error, reload } = useProduct()
  const { sidebarCollapsed, toggleSidebar, presenting, togglePresenting, setPresenting, setAgentRunOpen } = useUi()
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    let cancelled = false
    api
      .health()
      .then((h) => {
        if (!cancelled) setHealth(h)
      })
      .catch(() => {
        /* badges fall back to hidden */
      })
    return () => {
      cancelled = true
    }
  }, [])

  /* close dropdown on outside click */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const onRefresh = () => {
    setRefreshing(true)
    reload()
    api
      .health()
      .then((h) => setHealth(h))
      .catch(() => {})
      .finally(() => window.setTimeout(() => setRefreshing(false), 500))
  }

  const labelKey = pathname === '/' ? 'nav.productMri' : (PAGE_LABEL_KEYS.find(([p]) => pathname.startsWith(p))?.[1] ?? 'nav.productMri')

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-base/95 backdrop-blur pres-compact">
      <div className="mx-auto flex h-[60px] max-w-[1760px] items-center gap-3 px-4 md:px-6">
        {/* left: collapse + breadcrumb */}
        <div className="flex min-w-0 items-center gap-2 lg:w-[300px]">
          {!presenting && (
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden rounded-lg border border-line bg-card p-2 text-muted transition hover:border-primary hover:text-ink lg:block pres-hide"
              title={sidebarCollapsed ? t('top.expandSidebar') : t('top.collapseSidebar')}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          )}
          <nav className="flex min-w-0 items-center gap-1.5 text-[13px]" aria-label="Breadcrumb">
            <span className="shrink-0 font-medium text-muted">Review2Product</span>
            <span className="text-line2">/</span>
            <span className="truncate font-semibold text-ink">{t(labelKey)}</span>
          </nav>
        </div>

        {/* center: global product switcher */}
        <div className="flex min-w-0 flex-1 justify-center" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={loading || products.length === 0}
              className="flex max-w-[520px] items-center gap-2.5 rounded-xl border border-line2 bg-card py-1.5 pl-1.5 pr-3 text-left shadow-sm transition hover:border-primary disabled:opacity-50"
            >
              <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line">
                {currentProduct ? (
                  <ProductVisual
                    category={currentProduct.category}
                    title={currentProduct.product_title}
                    imageUrl={productImageUrl(currentProduct.product_id)}
                    float={false}
                    className="!h-full !w-full !rounded-lg !border-0"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-base2 text-faint">…</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {loading && !currentProduct
                    ? t('top.loadingProducts')
                    : (currentProduct ? productLabel(currentProduct.product_title, currentProduct.product_title_zh) : t('top.noProduct'))}
                </span>
                <span className="tnum block text-[11px] text-muted">
                  ASIN {currentProductId ?? '—'} · {currentProduct?.category ?? ''}
                </span>
              </span>
              {loading && <Spinner className="h-3.5 w-3.5" />}
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute left-1/2 top-full z-50 mt-2 max-h-[420px] w-[min(560px,80vw)] -translate-x-1/2 overflow-y-auto rounded-xl border border-line2 bg-card p-1.5 shadow-pop fade-in">
                {error && <p className="px-3 py-2 text-xs text-orange">{error}</p>}
                {products.map((p) => {
                  const active = p.product_id === currentProductId
                  return (
                    <button
                      key={p.product_id}
                      type="button"
                      onClick={() => {
                        setProduct(p.product_id)
                        setOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        active ? 'bg-tint' : 'hover:bg-cardhover'
                      }`}
                    >
                      <ProductOptionRow p={p} active={active} />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* right: status + presentation */}
        <div className="flex items-center justify-end gap-2 lg:w-[300px] xl:w-[380px] 2xl:w-[460px]">
          {currentProduct && (
            <span className="pres-hide hidden xl:inline-flex">
              <DataSourceBadge dataSource={currentProduct.data_source} />
            </span>
          )}
          {health && (
            <span className="pres-hide hidden 2xl:inline-flex">
              <LlmModeBadge mode={health.llm_mode} />
            </span>
          )}
          {/* Agent Run drawer trigger */}
          <button
            type="button"
            onClick={() => setAgentRunOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 px-2.5 py-2 text-xs font-semibold text-primary transition hover:border-primary hover:bg-primary hover:text-white"
            title={t('agent.runTitle')}
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agent Run</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-lg border border-line bg-card p-2 text-muted transition hover:border-primary hover:text-ink pres-hide"
            title={t('top.refresh')}
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
          {/* language switcher: 中 / EN */}
          <div
            className="flex items-center rounded-lg border border-line bg-card p-0.5 pres-hide"
            role="group"
            aria-label={t('top.language')}
            title={t('top.language')}
          >
            {(['zh', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  lang === l ? 'bg-primary text-white' : 'text-muted hover:text-ink'
                }`}
                aria-pressed={lang === l}
              >
                {l === 'zh' ? '中' : 'EN'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={togglePresenting}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition ${
              presenting
                ? 'border-primary bg-primary text-white shadow-sm hover:bg-primarydeep'
                : 'border-line bg-card text-muted hover:border-primary hover:text-ink'
            }`}
            title={t('top.presentationTitle')}
          >
            {presenting ? <X className="h-4 w-4" /> : <MonitorPlay className="h-4 w-4" />}
            <span className="hidden sm:inline">{presenting ? t('top.exit') : t('top.presentation')}</span>
          </button>
        </div>
      </div>

      {/* step indicator row */}
      <div
        className={`mx-auto flex max-w-[1760px] items-center justify-between gap-4 px-4 pb-2 md:px-6 ${
          presenting ? '' : 'pres-hide'
        }`}
      >
        <StepIndicator />
        {presenting && (
          <button
            type="button"
            onClick={() => setPresenting(false)}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-[11px] font-semibold text-muted shadow-sm transition hover:border-primary hover:text-primary"
          >
            {t('top.escExit')}
          </button>
        )}
      </div>
    </header>
  )
}
