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
        <button
          className="btn btn--ghost show-mobile"
          onClick={onOpenSidebar}
          aria-label="Otwórz menu"
          style={{ minHeight: '44px', minWidth: '44px' }}
        >
          <Menu size={18} />
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
            placeholder="Szukaj zestawów / folderów / słówek"
            className="top-nav__search-input"
            aria-label="Szukaj"
          />
        </form>

        <div className="top-nav__actions">
          <Link
            href="/library?action=import"
            className="btn btn--secondary hidden-mobile"
            style={{ height: '40px', minHeight: '40px' }}
          >
            Import
          </Link>
          <Link
            href="/create"
            className="btn btn--primary"
            style={{ height: '40px', minHeight: '40px' }}
          >
            <Plus size={16} className="show-mobile" />
            <span className="hidden-mobile">Nowy zestaw</span>
          </Link>
          <span className="top-nav__user hidden-mobile">{username}</span>
        </div>
      </div>
    </header>
  )
}
