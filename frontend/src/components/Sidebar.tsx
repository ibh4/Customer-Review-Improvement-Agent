import { NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  ScanSearch,
  Orbit,
  FileSearch,
  GitBranch,
  Rocket,
  Database,
  BookOpen,
} from 'lucide-react'
import { api } from '../api/client'
import type { HealthStatus } from '../types'
import { useUi } from '../context/UiContext'
import { useI18n } from '../i18n'

/* Brand mark: review bubble → arrow → product cube */
function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <rect width="40" height="40" rx="11" fill="url(#r2p-brand-g)" />
      {/* review bubble */}
      <path
        d="M9 13.5c0-1.66 1.34-3 3-3h9.5c1.66 0 3 1.34 3 3v5c0 1.66-1.34 3-3 3H16l-3.6 3.2V21.5H12c-1.66 0-3-1.34-3-3v-5z"
        fill="#FFFFFF"
        fillOpacity="0.94"
      />
      {/* arrow out of bubble */}
      <path
        d="M15.5 16h7.4m0 0l-2.4-2.4m2.4 2.4l-2.4 2.4"
        stroke="#4F7CFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* product cube */}
      <path d="M28.5 20.5l4.5 2.4v5l-4.5 2.4-4.5-2.4v-5l4.5-2.4z" fill="#FFFFFF" fillOpacity="0.35" stroke="#FFFFFF" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M28.5 20.5v4.9m0 0l4.5-2.45m-4.5 2.45l-4.5-2.45" stroke="#FFFFFF" strokeWidth="1.1" strokeLinejoin="round" strokeOpacity="0.8" />
      <defs>
        <linearGradient id="r2p-brand-g" x1="0" y1="0" x2="40" y2="40">
          <stop stopColor="#4F7CFF" />
          <stop offset="1" stopColor="#7C5CFC" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const NAV_SECTIONS: {
  labelKey: string
  items: { to: string; labelKey: string; icon: typeof ScanSearch; end: boolean }[]
}[] = [
  {
    labelKey: 'nav.overview',
    items: [
      { to: '/about', labelKey: 'nav.about', icon: BookOpen, end: false },
      { to: '/', labelKey: 'nav.productMri', icon: ScanSearch, end: true },
    ],
  },
  {
    labelKey: 'nav.intelligence',
    items: [
      { to: '/galaxy', labelKey: 'nav.painGalaxy', icon: Orbit, end: false },
      { to: '/evidence', labelKey: 'nav.evidence', icon: FileSearch, end: false },
    ],
  },
  {
    labelKey: 'nav.action',
    items: [
      { to: '/evolution', labelKey: 'nav.evolution', icon: GitBranch, end: false },
      { to: '/launch', labelKey: 'nav.launch', icon: Rocket, end: false },
    ],
  },
]

export function Sidebar() {
  const { sidebarCollapsed } = useUi()
  const { t } = useI18n()
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    let retryTimer = 0
    let attempts = 0
    const load = () => {
      api
        .health()
        .then((h) => {
          if (cancelled) return
          if ((h.reviews === 0 || h.products === 0) && attempts < 10) {
            /* backend cold start serves zeros before the store warms up */
            attempts += 1
            retryTimer = window.setTimeout(load, 1200)
            return
          }
          setHealth(h)
        })
        .catch(() => {
          /* footer badge is optional decoration */
        })
    }
    load()
    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
    }
  }, [])

  const w = sidebarCollapsed ? 'w-[72px]' : 'w-[232px]'
  const real = health ? health.data_source !== 'synthetic_demo' : true

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-card transition-[width] duration-200 lg:flex ${w}`}
    >
      {/* brand */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-4">
        <BrandMark />
        {!sidebarCollapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[14px] font-semibold tracking-tight text-ink">
              Review<span className="text-primary">2</span>Product
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
              {t('sidebar.brandSub')}
            </p>
          </div>
        )}
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.labelKey} className="mb-5 last:mb-0">
            {!sidebarCollapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
                {t(section.labelKey)}
              </p>
            )}
            {sidebarCollapsed && <div className="mx-3 mb-2 border-t border-line" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={sidebarCollapsed ? t(item.labelKey) : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium transition ${
                          sidebarCollapsed ? 'justify-center' : ''
                        } ${
                          isActive
                            ? 'bg-tint text-primary'
                            : 'text-muted hover:bg-cardhover hover:text-ink'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-[22px] w-[3px] -translate-y-1/2 rounded-full bg-primary" />
                          )}
                          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                          {!sidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* data source footer */}
      <div className="border-t border-line px-4 py-4">
        {!sidebarCollapsed ? (
          <>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint">
              <Database className="h-3 w-3" />
              {t('sidebar.dataSource')}
            </p>
            {health ? (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-ink">{t('sidebar.amazon')}</p>
                <p className="tnum text-[11px] leading-relaxed text-muted">
                  {t('sidebar.reviewsPlus', { n: health.reviews.toLocaleString() })}
                  <br />
                  {t('sidebar.productsCount', { n: health.products })}
                </p>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    real
                      ? 'border-success/40 bg-success/10 text-success'
                      : 'border-orange/40 bg-orange/10 text-orange'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${real ? 'bg-success' : 'bg-orange'}`} />
                  {real ? t('sidebar.realData') : t('sidebar.demoData')}
                </span>
              </div>
            ) : (
              <p className="text-[11px] text-faint">{t('sidebar.loading')}</p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5" title="Amazon Reviews '23">
            <Database className="h-4 w-4 text-muted" />
            <span
              className={`h-1.5 w-1.5 rounded-full ${real ? 'bg-success' : 'bg-orange'}`}
            />
          </div>
        )}
      </div>
    </aside>
  )
}
