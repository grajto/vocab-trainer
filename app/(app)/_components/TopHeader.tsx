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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Otwórz menu"
      >
        <Menu size={18} />
      </button>

      <form
        className="mx-auto flex h-11 w-full max-w-[760px] items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 shadow-sm"
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
        }}
      >
        <Search size={18} className="text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj zestawów, folderów, słówek..."
          className="w-full border-0 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          aria-label="Szukaj"
        />
      </form>
    </div>
  )
}
