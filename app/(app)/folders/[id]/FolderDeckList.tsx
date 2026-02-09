'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

interface DeckItem {
  id: string
  name: string
  description?: string
  updatedAt: string
  lastUsed?: string | null
}

export function FolderDeckList({ decks }: { decks: DeckItem[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'name' | 'last'>('date')

  const filtered = useMemo(() => {
    const list = decks.filter(deck => deck.name.toLowerCase().includes(search.toLowerCase()))
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'last') return (b.lastUsed || '').localeCompare(a.lastUsed || '')
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return sorted
  }, [decks, search, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Szukaj w folderze"
          className="flex-1 min-w-[200px] border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="date">Wg daty</option>
          <option value="name">Wg nazwy</option>
          <option value="last">Ostatnio użyte</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <p className="text-sm text-slate-400 mb-2">Brak zestawów w folderze.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(deck => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              prefetch={true}
              className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <p className="font-medium text-slate-900">{deck.name}</p>
              {deck.description && <p className="text-sm text-slate-400 mt-0.5">{deck.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
