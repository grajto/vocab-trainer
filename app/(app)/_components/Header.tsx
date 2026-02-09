'use client'

import Link from 'next/link'
import { Search, Plus, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SearchResult {
  type: 'deck' | 'folder'
  id: string
  name: string
}

export function Header({ username }: { username: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setShowResults(true)
        }
      } catch { /* ignore */ }
    }, 200)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="flex items-center gap-4 px-4 lg:px-6 py-3">
        {/* Spacer for mobile hamburger */}
        <div className="w-10 lg:hidden" />

        {/* Search */}
        <div ref={searchRef} className="flex-1 max-w-xl relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Search decks and folders…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:border-indigo-400 focus:outline-none transition-colors"
            />
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50">
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => {
                    router.push(r.type === 'deck' ? `/decks/${r.id}` : `/folders/${r.id}`)
                    setShowResults(false)
                    setQuery('')
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 w-12">{r.type}</span>
                  <span className="text-slate-900">{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create button */}
        <div className="relative">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            aria-label="Create"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          {showCreate && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50 w-48">
              <Link href="/decks?create=true" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700">
                New deck
              </Link>
              <Link href="/library?tab=folders&create=true" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700">
                New folder
              </Link>
              <Link href="/import" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-slate-50 text-slate-700">
                Import CSV
              </Link>
            </div>
          )}
        </div>

        {/* User */}
        <span className="text-xs text-slate-400 hidden sm:block">{username}</span>
      </div>
    </header>
  )
}
