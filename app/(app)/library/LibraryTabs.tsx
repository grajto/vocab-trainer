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
}

interface Folder {
  id: string
  name: string
  deckCount: number
  cardCount: number
  mastery: number
}

function moveFirst<T extends { id: string }>(items: T[], pinnedId?: string | null) {
  if (!pinnedId) return items
  const idx = items.findIndex((item) => item.id === pinnedId)
  if (idx <= 0) return items
  const clone = [...items]
  const [item] = clone.splice(idx, 1)
  clone.unshift(item)
  return clone
}

export function LibraryTabs({
  decks,
  folders,
  recentDeckId,
  recentFolderId,
}: {
  decks: Deck[]
  folders: Folder[]
  recentDeckId?: string | null
  recentFolderId?: string | null
}) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'folders' ? 'folders' : 'decks'
  const [tab, setTab] = useState<'decks' | 'folders'>(initialTab)
  const [search, setSearch] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(searchParams.get('create') === 'true' && initialTab === 'folders')
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const decksOrdered = moveFirst(decks, recentDeckId)
  const foldersOrdered = moveFirst(folders, recentFolderId)

  const filteredDecks = decksOrdered.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
  const filteredFolders = foldersOrdered.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
  const recentDeck = decksOrdered[0]
  const recentFolder = foldersOrdered[0]

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

  const tabClass = (active: boolean) =>
    `border-b-2 pb-2 text-sm font-semibold ${
      active ? 'border-[var(--primary)] text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:opacity-80'
    }`

  const actionBtnClass = 'rounded-full px-4 py-2 text-xs font-semibold'
  const actionBtnStyle = { border: '1px solid var(--border)', color: 'var(--text)' }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 pb-2">
        <button onClick={() => setTab('decks')} className={tabClass(tab === 'decks')}>Zestawy</button>
        <button onClick={() => setTab('folders')} className={tabClass(tab === 'folders')}>Foldery</button>
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <p className="text-sm text-[var(--text-muted)]">{tab === 'decks' ? 'Ostatni zestaw' : 'Ostatni folder'}</p>
        <div className="relative w-full lg:justify-self-end lg:max-w-[500px]">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-soft)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'decks' ? 'Wyszukaj zestaw' : 'Wyszukaj folder'}
            className="h-10 w-full rounded-full px-4 pr-12 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface-muted)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {tab === 'decks' && (
        <div className="space-y-6">
          {recentDeck ? (
            <Link
              href={`/decks/${recentDeck.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <IconSquare icon={BookOpen} variant="primary" size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">{recentDeck.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Ostatnio używany · {recentDeck.cardCount} słówek</p>
              </div>
            </Link>
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray600)' }}>Wszystkie zestawy</h3>
              <Link href="/create" className={actionBtnClass} style={actionBtnStyle}>Dodaj zestaw</Link>
            </div>
            {filteredDecks.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">Brak zestawów.</p>
            ) : (
              filteredDecks.map((d) => (
                <Link
                  key={d.id}
                  href={`/decks/${d.id}`}
                  className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--hover-bg)]"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <IconSquare icon={BookOpen} variant="primary" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{d.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">Zestaw · {d.cardCount} słówek</p>
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      )}

      {tab === 'folders' && (
        <div className="space-y-3">
          {recentFolder ? (
            <Link
              href={`/folders/${recentFolder.id}`}
              className="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <IconSquare icon={FolderOpen} variant="secondary" size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text)]">{recentFolder.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Ostatnio używany · {recentFolder.deckCount} zestawów</p>
              </div>
            </Link>
          ) : null}

          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--text)]">Wszystkie foldery</p>
            <div className="flex items-center gap-2">
              {!showCreateFolder && (
                <button onClick={() => setShowCreateFolder(true)} className={actionBtnClass} style={actionBtnStyle}>
                  Dodaj folder
                </button>
              )}
            </div>
          </div>

          {showCreateFolder && (
            <form onSubmit={createFolder} className="flex gap-2 rounded-[var(--card-radius)] p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Nazwa folderu"
                autoFocus
                className="h-10 flex-1 rounded-full px-3 text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)' }}
              />
              <button type="submit" disabled={creating} className="h-10 rounded-full px-4 text-sm font-semibold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                {creating ? 'Tworzenie…' : 'Utwórz'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="h-10 rounded-full px-3 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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
                <IconSquare icon={FolderOpen} variant="secondary" size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)]">{f.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">{f.deckCount} zestawów · {f.cardCount} słówek</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
