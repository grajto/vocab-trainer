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
          className="flex-1 min-w-[200px] rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="date">Wg daty</option>
          <option value="name">Wg nazwy</option>
          <option value="last">Ostatnio użyte</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--radius)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--gray400)' }}>Brak zestawów w folderze.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(deck => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              prefetch={true}
              className="block rounded-[var(--radius)] px-5 py-4 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <p className="font-medium" style={{ color: 'var(--text)' }}>{deck.name}</p>
              {deck.description && <p className="text-sm mt-0.5" style={{ color: 'var(--gray400)' }}>{deck.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
