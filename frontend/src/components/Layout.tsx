import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AgentRunDrawer } from './AgentRunDrawer'
import { useUi } from '../context/UiContext'

export function Layout({ children }: { children: ReactNode }) {
  const { sidebarCollapsed, presenting } = useUi()

  /* presentation mode: sidebar hidden entirely */
  const pad = presenting ? 'pl-0' : sidebarCollapsed ? 'lg:pl-[72px] pl-0' : 'lg:pl-[232px] pl-0'

  return (
    <div className="min-h-screen bg-base">
      {!presenting && <Sidebar />}
      <div className={`flex min-h-screen flex-col transition-[padding] duration-200 ${pad}`}>
        <Topbar />
        <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-5 md:px-6 md:py-6">{children}</main>
      </div>
      <AgentRunDrawer />
    </div>
  )
}
