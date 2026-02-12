'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { LeftSidebar } from './LeftSidebar'
import { QueryProvider } from '../../providers/QueryProvider'

export function AppShell({
  username,
  folders,
  children,
}: {
  username: string
  folders: Array<{ id: string; name: string }>
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <QueryProvider>
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="grid min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="hidden lg:block">
            <LeftSidebar folders={folders} />
          </div>

          <LeftSidebar folders={folders} mobile open={open} onClose={() => setOpen(false)} />

          <main className="app-main-shell min-w-0 pb-10" aria-label="Główna zawartość">
            <div className="mb-5 flex items-center gap-2 lg:hidden">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f8fafc]"
                style={{ color: 'var(--muted)' }}
                onClick={() => setOpen(true)}
                aria-label="Otwórz menu"
              >
                <Menu size={18} />
              </button>
            </div>
            {children}
          </main>
        </div>
      </div>
    </QueryProvider>
  )
}
