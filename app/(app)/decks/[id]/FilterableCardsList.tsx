'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { IconSquare } from '../../_components/ui/IconSquare'
import { useRouter } from 'next/navigation'
import { StarToggle } from '../../../_components/StarToggle'

interface Card {
  id: string
  front: string
  back: string
  starred?: boolean
}

interface Props {
  cards: Card[]
  deckId: string
}

type SortMode = 'default' | 'hardest'
type FieldFilter = 'both' | 'front' | 'back'

export function FilterableCardsList({ cards, deckId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [field, setField] = useState<FieldFilter>('both')
  const [visibleCount, setVisibleCount] = useState(30)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editFront, setEditFront] = useState('')
  const [editBack, setEditBack] = useState('')

  const filteredCards = useMemo(() => {
    let result = [...cards]
    
    // Filter by search term
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim()
      result = result.filter(
        (card) =>
          (field === 'both' || field === 'front' ? card.front.toLowerCase().includes(query) : false) ||
          (field === 'both' || field === 'back' ? card.back.toLowerCase().includes(query) : false)
      )
    }

    // Sort by hardest (for now, reverse order as proxy - would need error data)
    if (sortMode === 'hardest') {
      result = result.reverse()
    } else {
      result = result.sort((a, b) => a.front.localeCompare(b.front))
    }

    return result
  }, [cards, searchTerm, sortMode, field])

  const visibleCards = filteredCards.slice(0, visibleCount)

  useEffect(() => {
    setVisibleCount(30)
  }, [searchTerm, field, sortMode])

  async function handleDelete(cardId: string) {
    if (!confirm('Czy na pewno chcesz usunąć tę kartę?')) return
    
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to delete card:', err)
    }
  }

  async function handleSaveEdit(cardId: string) {
    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ front: editFront, back: editBack }),
      })
      if (res.ok) {
        setEditingId(null)
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to update card:', err)
    }
  }

  function startEdit(card: Card) {
    setEditingId(card.id)
    setEditFront(card.front)
    setEditBack(card.back)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Słówka ({filteredCards.length})
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={field}
            onChange={(e) => setField(e.target.value as FieldFilter)}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="both">Przód i tył</option>
            <option value="front">Tylko przód</option>
            <option value="back">Tylko tył</option>
          </select>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          >
            <option value="default">A-Z</option>
            <option value="hardest">Najtrudniejsze</option>
          </select>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Szukaj słówek..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 w-full rounded-lg px-4 pl-10 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        />
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-muted)' }}
        />
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {searchTerm ? 'Nie znaleziono słówek' : 'Brak kart. Dodaj pierwszą kartę poniżej.'}
        </p>
      ) : (
        <div className="space-y-2">
          {visibleCards.map((card) => {
            const isEditing = editingId === card.id

            if (isEditing) {
              return (
                <div
                  key={card.id}
                  className="rounded-lg px-4 py-3 space-y-2"
                  style={{ border: '1px solid var(--primary)', background: 'var(--primary-soft)' }}
                >
                  <input
                    type="text"
                    value={editFront}
                    onChange={(e) => setEditFront(e.target.value)}
                    className="h-9 w-full rounded px-3 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--border)' }}
                    placeholder="Przód"
                  />
                  <input
                    type="text"
                    value={editBack}
                    onChange={(e) => setEditBack(e.target.value)}
                    className="h-9 w-full rounded px-3 text-sm focus:outline-none"
                    style={{ border: '1px solid var(--border)' }}
                    placeholder="Tył"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(card.id)}
                      className="flex-1 h-8 rounded text-xs font-semibold text-white"
                      style={{ background: 'var(--primary)' }}
                    >
                      Zapisz
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 h-8 rounded text-xs font-semibold"
                      style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <IconSquare variant="muted" size={32}>
                  <span className="text-xs font-semibold">
                    {card.front ? card.front.charAt(0).toUpperCase() : '?'}
                  </span>
                </IconSquare>
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                    {card.front}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {card.back}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StarToggle cardId={card.id} initialStarred={Boolean(card.starred)} className="p-1.5 rounded hover:bg-[var(--hover-bg)] transition-colors" />
                  <button
                    type="button"
                    onClick={() => startEdit(card)}
                    className="p-1.5 rounded hover:bg-[var(--hover-bg)] transition-colors"
                    style={{ color: 'var(--text-soft)' }}
                    aria-label="Edytuj"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(card.id)}
                    className="p-1.5 rounded hover:bg-[var(--hover-bg)] transition-colors"
                    style={{ color: 'var(--danger)' }}
                    aria-label="Usuń"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
          {filteredCards.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + 30)}
              className="w-full rounded-lg border px-4 py-2 text-sm font-semibold"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            >
              Załaduj kolejne 30
            </button>
          )}
        </div>
      )}
    </section>
  )
}
