'use client'

import { useState } from 'react'
import { LeftSidebar } from './LeftSidebar'
import { TopHeader } from './TopHeader'

export function AppShell({
  folders,
  children,
}: {
  username: string
  folders: Array<{ id: string; name: string }>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <TopHeader onMenuClick={() => setOpen(true)} />

      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[272px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <LeftSidebar folders={folders} />
        </div>

        <LeftSidebar folders={folders} mobile open={open} onClose={() => setOpen(false)} />

        <main className="min-w-0 px-4 pb-8 pt-5 lg:px-8" aria-label="Główna zawartość">
          {children}
        </main>
      </div>
    </div>
  )
}
