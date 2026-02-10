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
    `border-b-2 pb-2 text-sm font-semibold ${active ? 'border-[#4255ff] text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 pb-2">
        <button onClick={() => setTab('decks')} className={tabClass(tab === 'decks')}>Zestawy fiszek</button>
        <button onClick={() => setTab('folders')} className={tabClass(tab === 'folders')}>Foldery</button>
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
        <p className="text-lg text-slate-600">Ostatnie zestawy</p>
        <div className="relative w-full lg:justify-self-end lg:max-w-[500px]">
          <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tab === 'decks' ? 'Wyszukaj fiszki' : 'Wyszukaj folder'}
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      </div>

      {tab === 'decks' && (
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">W tym tygodniu</h3>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            {filteredDecks.length === 0 ? (
              <p className="text-sm text-slate-500">Brak zestawów.</p>
            ) : (
              filteredDecks.map((d) => (
                <Link key={d.id} href={`/decks/${d.id}`} className="block rounded-md border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm text-slate-600">{d.cardCount} pojęć · {d.author}</p>
                  <p className="text-3xl font-semibold leading-tight tracking-tight text-slate-800">{d.name}</p>
                </Link>
              ))
            )}
          </section>
        </div>
      )}

      {tab === 'folders' && (
        <div className="space-y-3">
          {showCreateFolder ? (
            <form onSubmit={createFolder} className="flex gap-2 rounded-xl border border-slate-200 bg-white p-4">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Nazwa folderu"
                autoFocus
                className="h-11 flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none"
              />
              <button type="submit" disabled={creating} className="h-11 rounded-lg bg-[#eef1ff] px-4 text-sm font-semibold text-[#4255ff] hover:bg-[#e4e9ff]">
                {creating ? 'Tworzenie…' : 'Utwórz'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="h-11 rounded-lg border border-slate-200 px-3 text-sm text-slate-600">
                Anuluj
              </button>
            </form>
          ) : (
            <button onClick={() => setShowCreateFolder(true)} className="w-full rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 hover:bg-slate-50">
              + Nowy folder
            </button>
          )}

          {filteredFolders.map((f) => (
            <Link key={f.id} href={`/folders/${f.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
              <FolderOpen className="h-5 w-5 text-[#4255ff]" />
              <div>
                <p className="text-base font-semibold text-slate-900">{f.name}</p>
                <p className="text-xs text-slate-500">{f.deckCount} zestawów · {f.cardCount} pojęć</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
