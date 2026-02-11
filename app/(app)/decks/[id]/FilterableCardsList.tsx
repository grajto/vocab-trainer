'use client'

import { useState, useMemo } from 'react'
import { Search, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { IconSquare } from '../../_components/ui/IconSquare'
import { useRouter } from 'next/navigation'

interface Card {
  id: string
  front: string
  back: string
}

interface Props {
  cards: Card[]
  deckId: string
}

type SortMode = 'default' | 'hardest'

export function FilterableCardsList({ cards, deckId }: Props) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('default')
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
          card.front.toLowerCase().includes(query) ||
          card.back.toLowerCase().includes(query)
      )
    }

    // Sort by hardest (for now, reverse order as proxy - would need error data)
    if (sortMode === 'hardest') {
      result = result.reverse()
    }

    return result
  }, [cards, searchTerm, sortMode])

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
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="rounded-lg px-3 py-1.5 text-xs focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="default">Domyślne</option>
          <option value="hardest">Najtrudniejsze</option>
        </select>
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
          {filteredCards.map((card) => {
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
        </div>
      )}
    </section>
  )
}
