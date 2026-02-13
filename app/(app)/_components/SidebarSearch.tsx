'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

interface SearchResult {
  type: 'deck' | 'folder' | 'card'
  id: string
  name: string
  meta?: string
  deckId?: string
}

export function SidebarSearch() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const router = useRouter()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (!q.trim()) {
      setResults([])
      setShowResults(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setShowResults(true)
        }
      } catch {
        /* ignore */
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const groupedResults = {
    decks: results.filter((r) => r.type === 'deck'),
    folders: results.filter((r) => r.type === 'folder'),
    cards: results.filter((r) => r.type === 'card'),
  }

  return (
    <div ref={wrapRef} className="relative mt-4">
      <form
        className="flex h-11 w-full items-center gap-2 rounded-full px-4"
        style={{ border: '1px solid var(--border)', background: 'var(--surface-muted)' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (q.trim()) {
            setShowResults(false)
            router.push(`/library?q=${encodeURIComponent(q.trim())}`)
          }
        }}
      >
        <Search size={18} className="text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Szukaj…"
          className="w-full border-0 bg-transparent text-sm placeholder:text-[var(--text-soft)] focus:outline-none text-[var(--text)]"
          aria-label="Szukaj"
        />
      </form>

      {showResults && results.length > 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[420px] overflow-y-auto"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            borderRadius: 'var(--input-radius)',
          }}
        >
          {groupedResults.decks.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}
              >
                Zestawy
              </div>
              {groupedResults.decks.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={`/decks/${r.id}`}
                  onClick={() => {
                    setShowResults(false)
                    setQ('')
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  <span className="truncate font-medium">{r.name}</span>
                </Link>
              ))}
            </div>
          )}

          {groupedResults.folders.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}
              >
                Foldery
              </div>
              {groupedResults.folders.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={`/folders/${r.id}`}
                  onClick={() => {
                    setShowResults(false)
                    setQ('')
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  <span className="truncate font-medium">{r.name}</span>
                </Link>
              ))}
            </div>
          )}

          {groupedResults.cards.length > 0 && (
            <div>
              <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}
              >
                Słówka
              </div>
              {groupedResults.cards.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={`/decks/${r.deckId || r.id}`}
                  onClick={() => {
                    setShowResults(false)
                    setQ('')
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--hover-bg)] text-[var(--text)]"
                >
                  <span className="truncate font-medium">{r.name}</span>
                  {r.meta && (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {r.meta}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
