/**
 * I18n provider — re-renders the tree on language change and keeps the
 * module-level lang in sync for non-React consumers (chart builders).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getLang, setLangRaw, tr, type Lang, type TFn } from './core'
import './dict'

const STORAGE_KEY = 'r2p.lang'

interface I18nCtx {
  lang: Lang
  setLang: (l: Lang) => void
  toggleLang: () => void
  t: TFn
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(getLang())

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangRaw(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
    setLangState(l)
  }, [])

  const toggleLang = useCallback(() => setLang(getLang() === 'zh' ? 'en' : 'zh'), [setLang])

  /* fresh identity per language so consumers can safely use t in deps */
  const t = useCallback((key: string, params?: Record<string, string | number>) => tr(key, params), [lang])

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n(): I18nCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n must be used within I18nProvider')
  return c
}

export { tr, painLabel, productLabel, registerDict, getLang } from './core'
export type { Lang, TFn } from './core'
