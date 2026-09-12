import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'

/**
 * StepIndicator — the 5-step demo flow: keep it very light.
 * 01 OBSERVE → 02 UNDERSTAND → 03 EVIDENCE → 04 EVOLVE → 05 LAUNCH
 */
const STEPS = [
  { n: '01', labelKey: 'step.observe', to: '/' },
  { n: '02', labelKey: 'step.understand', to: '/galaxy' },
  { n: '03', labelKey: 'step.evidence', to: '/evidence' },
  { n: '04', labelKey: 'step.evolve', to: '/evolution' },
  { n: '05', labelKey: 'step.launch', to: '/launch' },
]

export function StepIndicator() {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const activeIdx = Math.max(
    0,
    STEPS.findIndex((s) => (s.to === '/' ? pathname === '/' : pathname.startsWith(s.to)))
  )

  return (
    <nav aria-label="Demo flow" className="flex items-center gap-1 overflow-x-auto">
      {STEPS.map((s, i) => {
        const active = i === activeIdx
        const done = i < activeIdx
        return (
          <Link
            key={s.to}
            to={s.to}
            className={`group flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 transition ${
              active ? 'bg-tint' : 'hover:bg-cardhover'
            }`}
            title={t('step.tooltip', { n: s.n, label: t(s.labelKey) })}
          >
            <span
              className={`tnum text-[10px] font-bold tracking-wide ${
                active ? 'text-primary' : done ? 'text-success' : 'text-faint'
              }`}
            >
              {s.n}
            </span>
            <span
              className={`text-[10px] font-semibold tracking-[0.12em] ${
                active ? 'text-primary' : done ? 'text-muted' : 'text-faint'
              }`}
            >
              {t(s.labelKey)}
            </span>
            {i < STEPS.length - 1 && (
              <svg className="ml-0.5 h-3 w-3 text-line2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
