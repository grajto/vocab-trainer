'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, FolderOpen, Search } from 'lucide-react'
import { IconSquare } from '../_components/ui/IconSquare'

interface Deck {
  id: string
  name: string
  cardCount: number
  author: string
  createdAt: string
  lastUsed?: string | null
}

interface Folder {
  id: string
  name: string
  deckCount: number
  cardCount: number
  mastery: number
}

export function LibraryTabs({ decks, folders }: { decks: Deck[]; folders: Folder[] }) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'folders' ? 'folders' : 'decks'
  const [tab, setTab] = useState<'decks' | 'folders'>(initialTab)
  const [search, setSearch] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(searchParams.get('create') === 'true' && initialTab === 'folders')
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const filteredDecks = decks
    .filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      // Sort by last used (most recent first), fallback to createdAt
      const aTime = a.lastUsed || a.createdAt
      const bTime = b.lastUsed || b.createdAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  
  const filteredFolders = folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))

  async function createFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!folderName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: folderName.trim() }),
      })
      if (res.ok) {
        setFolderName('')
        setShowCreateFolder(false)
        router.refresh()
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <div className="flex items-center gap-6 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setTab('decks')}
            className="relative pb-3 text-sm font-semibold transition-colors -mb-px"
            style={{
              color: tab === 'decks' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === 'decks' ? '3px solid var(--primary)' : '3px solid transparent',
            }}
          >
            Zestawy
          </button>
          <button
            onClick={() => setTab('folders')}
            className="relative pb-3 text-sm font-semibold transition-colors -mb-px"
            style={{
              color: tab === 'folders' ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === 'folders' ? '3px solid var(--primary)' : '3px solid transparent',
            }}
          >
            Foldery
          </button>
        </div>
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          {tab === 'decks' ? 'Ostatnio używane zestawy' : 'Twoje foldery'}
        </p>
        <div className="relative w-full lg:justify-self-end lg:max-w-[500px]">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--gray400)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'decks' ? 'Wyszukaj zestaw' : 'Wyszukaj folder'}
            className="h-10 w-full rounded-full px-4 pr-12 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {tab === 'decks' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray600)' }}>W tym tygodniu</h3>

            {filteredDecks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Brak zestawów.</p>
            ) : (
              filteredDecks.map((d) => (
                <Link
                  key={d.id}
                  href={`/decks/${d.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--hover-bg)]"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <IconSquare variant="primary" size={36}>
                    <BookOpen size={18} />
                  </IconSquare>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {d.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {d.cardCount} pojęć
                    </p>
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      )}

      {tab === 'folders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Wszystkie foldery</p>
            {!showCreateFolder && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="rounded-full px-4 py-2 text-xs font-semibold"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Dodaj folder
              </button>
            )}
          </div>

          {showCreateFolder && (
            <form onSubmit={createFolder} className="flex gap-2 rounded-[var(--radius)] p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Nazwa folderu"
                autoFocus
                className="h-10 flex-1 rounded-full px-3 text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)' }}
              />
              <button type="submit" disabled={creating} className="h-10 rounded-full px-4 text-sm font-semibold" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
                {creating ? 'Tworzenie…' : 'Utwórz'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="h-10 rounded-full px-3 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
                Anuluj
              </button>
            </form>
          )}

          <div className="space-y-2">
            {filteredFolders.map((f) => (
              <Link
                key={f.id}
                href={`/folders/${f.id}`}
                className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--hover-bg)]"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <IconSquare variant="muted" size={36}>
                  <FolderOpen size={18} />
                </IconSquare>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                    {f.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {f.deckCount} zestawów · {f.cardCount} pojęć
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
