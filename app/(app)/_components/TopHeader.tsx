'use client'

import { Menu, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function TopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const [q, setQ] = useState('')
  const router = useRouter()

  return (
    <div className="mb-5 flex items-center gap-2 pt-1">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-[#f8fafc] lg:hidden"
        style={{ color: 'var(--muted)' }}
        onClick={onMenuClick}
        aria-label="Otwórz menu"
      >
        <Menu size={18} />
      </button>

      <form
        className="mx-auto flex h-10 w-full max-w-[760px] items-center gap-2 rounded-full px-4"
        style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
        }}
      >
        <Search size={18} style={{ color: 'var(--gray400)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj …"
          className="w-full border-0 bg-transparent text-sm placeholder:text-[var(--gray400)] focus:outline-none"
          style={{ color: 'var(--text)' }}
          aria-label="Szukaj"
        />
      </form>
    </div>
  )
}
