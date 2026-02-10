'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FolderOpen, Search } from 'lucide-react'

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

export function LibraryTabs({ decks, folders }: { decks: Deck[]; folders: Folder[] }) {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'folders' ? 'folders' : 'decks'
  const [tab, setTab] = useState<'decks' | 'folders'>(initialTab)
  const [search, setSearch] = useState('')
  const [showCreateFolder, setShowCreateFolder] = useState(searchParams.get('create') === 'true' && initialTab === 'folders')
  const [folderName, setFolderName] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const filteredDecks = decks.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
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

  const tabClass = (active: boolean) =>
    `border-b-2 pb-2 text-sm font-semibold ${active ? 'border-[var(--primary)]' : 'border-transparent hover:opacity-80'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setTab('decks')} className={tabClass(tab === 'decks')} style={{ color: tab === 'decks' ? 'var(--text)' : 'var(--muted)' }}>Zestawy fiszek</button>
        <button onClick={() => setTab('folders')} className={tabClass(tab === 'folders')} style={{ color: tab === 'folders' ? 'var(--text)' : 'var(--muted)' }}>Foldery</button>
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Ostatnie zestawy</p>
        <div className="relative w-full lg:justify-self-end lg:max-w-[500px]">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--gray400)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'decks' ? 'Wyszukaj fiszki' : 'Wyszukaj folder'}
            className="h-12 w-full rounded-2xl px-4 pr-12 text-base focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }}
          />
        </div>
      </div>

      {tab === 'decks' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--gray600)' }}>W tym tygodniu</h3>
              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            </div>

            {filteredDecks.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Brak zestawów.</p>
            ) : (
              filteredDecks.map((d) => (
                <Link key={d.id} href={`/decks/${d.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:shadow-lg hover:scale-[1.01]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
                  <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
                    <FolderOpen className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{d.name}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>Zestaw fiszek • {d.cardCount} pojęć • {d.author}</p>
                  </div>
                  <span style={{ color: 'var(--gray400)' }}>•••</span>
                </Link>
              ))
            )}
          </section>
        </div>
      )}

      {tab === 'folders' && (
        <div className="space-y-3">
          {showCreateFolder ? (
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
          ) : (
            <button onClick={() => setShowCreateFolder(true)} className="w-full rounded-[var(--radius)] p-4 text-sm hover:bg-[#f8fafc]" style={{ border: '1px dashed var(--border)', color: 'var(--muted)' }}>
              + Nowy folder
            </button>
          )}

          {filteredFolders.map((f) => (
            <Link key={f.id} href={`/folders/${f.id}`} className="flex items-center gap-3 rounded-2xl px-4 py-4 transition-all hover:shadow-lg hover:scale-[1.01]" style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
              <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
                <FolderOpen className="h-3 w-3" />
              </span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{f.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{f.deckCount} zestawów · {f.cardCount} pojęć</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
