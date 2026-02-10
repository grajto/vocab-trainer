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
    <header className="sticky top-0 z-30 bg-[var(--surface)] backdrop-blur-sm" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex items-center gap-4 px-4 lg:px-6 py-4">
        {/* Spacer for mobile hamburger */}
        <div className="w-10 lg:hidden" />

        {/* Search */}
        <div ref={searchRef} className="flex-1 max-w-2xl relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gray400)]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setShowResults(true)}
              placeholder="Szukaj zestawów, folderów, pytań"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-full text-[var(--text)] placeholder:text-[var(--gray400)] focus:bg-[var(--surface)] focus:border-[var(--primary)] focus:outline-none transition-colors"
            />
          </div>
          {showResults && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden z-50">
              {results.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => {
                    router.push(r.type === 'deck' ? `/decks/${r.id}` : `/folders/${r.id}`)
                    setShowResults(false)
                    setQuery('')
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--surface2)] flex items-center gap-2" style={{ color: 'var(--text)' }}
                >
                  <span className="text-[10px] font-medium uppercase tracking-wide w-12" style={{ color: 'var(--gray400)' }}>{r.type}</span>
                  <span style={{ color: 'var(--text)' }}>{r.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create button */}
        <div className="relative">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="p-2 rounded-full bg-[var(--primary)] text-white hover:brightness-110 transition-colors"
            aria-label="Create"
          >
            {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          {showCreate && (
            <div className="absolute right-0 top-full mt-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] overflow-hidden z-50 w-48">
              <Link href="/decks?create=true" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface2)]" style={{ color: 'var(--text)' }}>
                Nowy zestaw
              </Link>
              <Link href="/library?tab=folders&create=true" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface2)]" style={{ color: 'var(--text)' }}>
                Nowy folder
              </Link>
              <Link href="/import" onClick={() => setShowCreate(false)} className="block px-4 py-2.5 text-sm hover:bg-[var(--surface2)]" style={{ color: 'var(--text)' }}>
                Importuj CSV
              </Link>
            </div>
          )}
        </div>

        {/* User */}
        <span className="text-xs hidden sm:block" style={{ color: 'var(--muted)' }}>{username}</span>
      </div>
    </header>
  )
}
