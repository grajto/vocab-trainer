'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FolderOpen, Search, MoreHorizontal } from 'lucide-react'

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

  const filteredDecks = decks.filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
  const filteredFolders = folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

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
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab('decks')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'decks' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Decks ({decks.length})
          </button>
          <button
            onClick={() => setTab('folders')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === 'folders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Folders ({folders.length})
          </button>
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-indigo-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Decks tab */}
      {tab === 'decks' && (
        <div className="space-y-3">
          {filteredDecks.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No decks found.</p>
          ) : (
            filteredDecks.map(d => (
              <div key={d.id} className="bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-sm transition-all">
                <Link href={`/decks/${d.id}`} prefetch={true} className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{d.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {d.cardCount} kart · {d.author} · {d.createdAt}
                  </p>
                </Link>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Folders tab */}
      {tab === 'folders' && (
        <div className="space-y-3">
          {showCreateFolder && (
            <form onSubmit={createFolder} className="bg-white border border-slate-200 rounded-xl p-4 flex gap-2">
              <input
                type="text"
                value={folderName}
                onChange={e => setFolderName(e.target.value)}
                placeholder="Folder name"
                autoFocus
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
              />
              <button type="submit" disabled={creating} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="text-sm text-slate-400 hover:text-slate-600 px-2">
                Cancel
              </button>
            </form>
          )}
          {!showCreateFolder && (
            <button
              onClick={() => setShowCreateFolder(true)}
              className="w-full bg-white border border-dashed border-slate-300 rounded-xl p-4 text-sm text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            >
              + New folder
            </button>
          )}
          {filteredFolders.length === 0 && !showCreateFolder ? (
            <p className="text-sm text-slate-400 text-center py-4">No folders yet.</p>
          ) : (
            filteredFolders.map(f => (
              <div key={f.id} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <Link href={`/folders/${f.id}`} prefetch={true} className="flex items-center gap-3 min-w-0">
                  <FolderOpen className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{f.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{f.deckCount} decków · {f.cardCount} kart · {f.mastery}% mastery</p>
                  </div>
                </Link>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
