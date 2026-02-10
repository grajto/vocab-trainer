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
    <div className="min-h-screen bg-white text-slate-800">
      <div className="grid min-h-screen lg:grid-cols-[272px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <LeftSidebar folders={folders} />
        </div>

        <LeftSidebar folders={folders} mobile open={open} onClose={() => setOpen(false)} />

        <main className="min-w-0 px-4 pb-8 pt-4 lg:px-8" aria-label="Główna zawartość">
          <TopHeader onMenuClick={() => setOpen(true)} />
          {children}
        </main>
      </div>
    </div>
  )
}
