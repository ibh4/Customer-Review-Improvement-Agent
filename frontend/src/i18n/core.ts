/**
 * i18n core — framework-free, no React imports so chart builders can use it too.
 * Language state lives at module level; the provider keeps it in sync and
 * re-renders the tree on change.
 */
export type Lang = 'zh' | 'en'
export type TFn = (key: string, params?: Record<string, string | number>) => string

const STORAGE_KEY = 'r2p.lang'

const dicts: Record<Lang, Record<string, string>> = { zh: {}, en: {} }

/** register a dictionary fragment (common dict + per-page dicts) */
export function registerDict(d: { zh: Record<string, string>; en: Record<string, string> }): void {
  Object.assign(dicts.zh, d.zh)
  Object.assign(dicts.en, d.en)
}

function readInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'zh' || saved === 'en') return saved
  } catch {
    /* SSR / privacy mode — fall through */
  }
  return 'zh'
}

let activeLang: Lang = readInitialLang()

export function getLang(): Lang {
  return activeLang
}

export function setLangRaw(l: Lang): void {
  activeLang = l
}

/** translate a key with `{placeholder}` interpolation; falls back to en, then the key itself */
export function tr(key: string, params?: Record<string, string | number>): string {
  let s = dicts[activeLang][key] ?? dicts.en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(String(v))
    }
  }
  return s
}

/**
 * Bilingual pain label — the analysis API ships both a stable English key
 * (`name`, e.g. "Durability") and an LLM display name (`display_name`, e.g.
 * "耐用性 / 掉漆变形"). Chinese UI shows the display name, English UI the key.
 */
export function painLabel(p: { name: string; display_name: string }): string {
  /* fallback keyword clusters ("Other: hair / curly") get a cleaner frame —
     the raw keywords are real review terms and stay as-is */
  const kw = /^(?:Other|其他)\s*[:：]\s*(.+)$/i.exec(p.name)?.[1]
  if (kw) return activeLang === 'zh' ? `其他问题 · ${kw}` : `Other · ${kw}`
  return activeLang === 'zh' ? p.display_name : p.name
}

/**
 * Bilingual product title — 中文短名在前、英文原名在后（两种语言模式下都显示双语）。
 * Falls back to the raw English title when no Chinese name is available.
 */
export function productLabel(title: string, titleZh?: string | null): string {
  return titleZh && titleZh.trim() ? `${titleZh} · ${title}` : title
}
