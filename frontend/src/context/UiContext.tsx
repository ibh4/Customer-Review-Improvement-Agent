import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

interface UiContextValue {
  /** sidebar collapsed to icon rail */
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  /** presentation mode: hide chrome, enlarge charts, 16:9 friendly */
  presenting: boolean
  setPresenting: (v: boolean) => void
  togglePresenting: () => void
  /** Agent Run drawer (global, opens from Topbar / MRI card / decision panel) */
  agentRunOpen: boolean
  setAgentRunOpen: (v: boolean) => void
}

const UiContext = createContext<UiContextValue | null>(null)

const COLLAPSE_KEY = 'r2p.sidebarCollapsed'

export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => window.localStorage.getItem(COLLAPSE_KEY) === '1'
  )
  const [presenting, setPresenting] = useState(false)
  const [agentRunOpen, setAgentRunOpen] = useState(false)

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1')
      return !v
    })
  }, [])

  const togglePresenting = useCallback(() => setPresenting((v) => !v), [])

  /* html.presenting drives global CSS (font scale, chart heights, chrome hiding) */
  useEffect(() => {
    document.documentElement.classList.toggle('presenting', presenting)
  }, [presenting])

  /* esc exits presentation mode */
  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting])

  const value = useMemo<UiContextValue>(
    () => ({
      sidebarCollapsed,
      toggleSidebar,
      presenting,
      setPresenting,
      togglePresenting,
      agentRunOpen,
      setAgentRunOpen,
    }),
    [sidebarCollapsed, toggleSidebar, presenting, togglePresenting, agentRunOpen]
  )
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

export function useUi(): UiContextValue {
  const ctx = useContext(UiContext)
  if (!ctx) throw new Error('useUi must be used within UiProvider')
  return ctx
}
