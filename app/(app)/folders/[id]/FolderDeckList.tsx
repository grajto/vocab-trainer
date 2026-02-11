'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookOpen, Trash2 } from 'lucide-react'
import { IconSquare } from '../../_components/ui/IconSquare'
import { pluralizeCards } from '@/src/lib/utils'

interface DeckItem {
  id: string
  name: string
  description?: string
  updatedAt: string
  lastUsed?: string | null
  cardCount?: number
  folderId?: string
}

interface FolderOption {
  id: string
  name: string
}

export function FolderDeckList({ decks, folders }: { decks: DeckItem[]; folders: FolderOption[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'date' | 'name' | 'last'>('date')
  const [items, setItems] = useState(decks)

  async function updateDeckFolder(deckId: string, nextFolderId: string | null) {
    await fetch(`/api/decks/${deckId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ folderId: nextFolderId }),
    })
    setItems(prev => prev.map(d => d.id === deckId ? { ...d, folderId: nextFolderId || '' } : d).filter(d => d.folderId !== ''))
  }

  const filtered = useMemo(() => {
    const list = items.filter((deck) => deck.name.toLowerCase().includes(search.toLowerCase()))
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'last') return (b.lastUsed || '').localeCompare(a.lastUsed || '')
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return sorted
  }, [items, search, sort])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Szukaj w folderze" className="flex-1 min-w-[200px] rounded-[var(--input-radius)] px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }} />
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-[var(--input-radius)] px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
          <option value="date">Wg daty</option><option value="name">Wg nazwy</option><option value="last">Ostatnio użyte</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 rounded-[var(--card-radius)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-2" style={{ color: 'var(--text-soft)' }}>Brak zestawów w folderze.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((deck) => (
            <div key={deck.id} className="flex items-center gap-3 rounded-[var(--card-radius)] px-4 py-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Link href={`/decks/${deck.id}`} prefetch className="flex min-w-0 flex-1 items-center gap-3">
                <IconSquare><BookOpen size={16} /></IconSquare>
                <div className="min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{deck.name}</p>
                  {deck.cardCount !== undefined && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{deck.cardCount} {pluralizeCards(deck.cardCount)}</p>}
                </div>
              </Link>
              <select
                defaultValue={deck.folderId || ''}
                onChange={(e) => updateDeckFolder(deck.id, e.target.value || null)}
                className="rounded-lg border px-2 py-1 text-xs"
                style={{ borderColor: 'var(--border)' }}
              >
                <option value="">Bez folderu</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button type="button" onClick={() => updateDeckFolder(deck.id, null)} className="rounded-md p-1" style={{ color: 'var(--danger)' }} aria-label="Usuń z folderu">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
