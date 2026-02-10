'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'

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
    <div>
      <TopNav />
      <div className="app-layout">
        <div className="hidden-mobile">
          <Sidebar folders={folders} />
        </div>
        <Sidebar folders={folders} mobile open={open} onClose={() => setOpen(false)} />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
