'use client'

import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TopNav() {
  const [q, setQ] = useState('')
  const router = useRouter()

  return (
    <header className="top-nav-minimal">
      <div className="top-nav-minimal__inner">
        <form
          className="top-nav-minimal__search"
          onSubmit={e => {
            e.preventDefault()
            if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Search size={18} className="top-nav-minimal__search-icon" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Szukaj zestawów, folderów, słówek..."
            className="top-nav-minimal__search-input"
            aria-label="Szukaj"
          />
        </form>
      </div>
    </header>
  )
}
