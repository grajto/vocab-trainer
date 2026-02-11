'use client'

import { Search, BookOpen, FolderOpen, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

type SearchResult = {
  type: 'deck' | 'folder' | 'card'
  id: string
  name: string
  meta: string
  deckId?: string
}

export function TopNav() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (!q.trim()) {
        setResults([])
        setShowDropdown(false)
        return
      }
      
      setLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`)
        const data = await res.json()
        setResults(data.results || [])
        setShowDropdown(data.results?.length > 0)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounce)
  }, [q])

  const decks = results.filter(r => r.type === 'deck')
  const folders = results.filter(r => r.type === 'folder')
  const cards = results.filter(r => r.type === 'card')

  return (
    <header className="top-nav-minimal">
      <div className="top-nav-minimal__inner">
        <div ref={searchRef} className="top-nav-minimal__search">
          <form
            onSubmit={e => {
              e.preventDefault()
              if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
              setShowDropdown(false)
            }}
          >
            <Search size={18} className="top-nav-minimal__search-icon" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Szukaj zestawów, folderów, słówek..."
              className="top-nav-minimal__search-input"
              aria-label="Szukaj"
            />
          </form>

          {showDropdown && (
            <div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl bg-white border overflow-hidden"
              style={{ 
                borderColor: 'var(--border)', 
                maxHeight: '400px', 
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
            >
              {loading && (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Wyszukiwanie...
                </div>
              )}

              {!loading && results.length === 0 && (
                <div className="p-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  Brak wyników
                </div>
              )}

              {!loading && decks.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}>
                    Zestawy
                  </div>
                  {decks.map(deck => (
                    <Link
                      key={deck.id}
                      href={`/decks/${deck.id}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <BookOpen size={16} style={{ color: 'var(--primary)' }} />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{deck.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {!loading && folders.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}>
                    Foldery
                  </div>
                  {folders.map(folder => (
                    <Link
                      key={folder.id}
                      href={`/folders/${folder.id}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <FolderOpen size={16} style={{ color: 'var(--warning)' }} />
                      <span className="text-sm" style={{ color: 'var(--text)' }}>{folder.name}</span>
                    </Link>
                  ))}
                </div>
              )}

              {!loading && cards.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', background: 'var(--surface-muted)' }}>
                    Słowa
                  </div>
                  {cards.map(card => (
                    <Link
                      key={card.id}
                      href={`/decks/${card.deckId}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <FileText size={16} style={{ color: 'var(--text-muted)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate" style={{ color: 'var(--text)' }}>{card.name}</div>
                        <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{card.meta}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
