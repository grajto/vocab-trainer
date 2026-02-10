'use client'

import { Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from './Button'

export function Navbar({ username }: { username: string }) {
  const [value, setValue] = useState('')

  return (
    <header className="sticky top-0 z-20 border-b border-vt-border bg-vt-bg/90 backdrop-blur">
      <div className="flex items-center gap-4 px-4 py-4 lg:px-8">
        <div className="w-10 lg:hidden" />
        <div className="relative max-w-3xl flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-vt-muted" />
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Search sets and folders"
            className="w-full rounded-pill border border-vt-border bg-vt-surface py-3 pl-11 pr-4 text-vt-text placeholder:text-vt-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary"
          />
        </div>
        <Link href="/create">
          <Button className="h-12 w-12 p-0" aria-label="Create set">
            <Plus className="h-5 w-5" />
          </Button>
        </Link>
        <span className="hidden text-sm font-semibold text-vt-muted sm:block">{username}</span>
      </div>
    </header>
  )
}
