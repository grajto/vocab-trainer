'use client'

import Link from 'next/link'
import { Menu, Plus, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TopNav({ username, onOpenSidebar }: { username: string; onOpenSidebar: () => void }) {
  const [q, setQ] = useState('')
  const router = useRouter()

  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <button className="btn btn--ghost show-mobile" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu size={16} />
        </button>

        <Link href="/dashboard" className="top-nav__logo">Vocab Trainer</Link>

        <form
          className="top-nav__search"
          onSubmit={e => {
            e.preventDefault()
            if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Search size={14} className="top-nav__search-icon" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj zestawów, folderów, pytań"
            className="top-nav__search-input"
          />
        </form>

        <div className="top-nav__actions">
          <Link href="/create" className="top-nav__plus" aria-label="Nowy zestaw">
            <Plus size={16} />
          </Link>
          <span className="top-nav__user">{username}</span>
        </div>
      </div>
    </header>
  )
}
