'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { IconSquare } from '../../_components/ui/IconSquare'
import { pluralizeCards } from '@/src/lib/utils'

interface DeckItem {
  id: string
  name: string
  description?: string
  updatedAt: string
  lastUsed?: string | null
  cardCount?: number
}

export function FolderDeckList({ decks }: { decks: DeckItem[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'name' | 'last'>('date')

  const filtered = useMemo(() => {
    const list = decks.filter((deck) => deck.name.toLowerCase().includes(search.toLowerCase()))
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
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj w folderze"
          className="flex-1 min-w-[200px] rounded-[var(--input-radius)] px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-[var(--input-radius)] px-3 py-2 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="date">Wg daty</option>
          <option value="name">Wg nazwy</option>
          <option value="last">Ostatnio użyte</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-[var(--card-radius)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-soft)' }}>
            Brak zestawów w folderze.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((deck) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              prefetch={true}
              className="flex items-center gap-3 rounded-[var(--card-radius)] px-4 py-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <IconSquare>
                <BookOpen size={16} />
              </IconSquare>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {deck.name}
                </p>
                {deck.cardCount !== undefined && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {deck.cardCount} {pluralizeCards(deck.cardCount)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
