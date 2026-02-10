'use client'

import { useState, useMemo } from 'react'
import { Search, Star, Volume2, Pencil } from 'lucide-react'
import { IconSquare } from '../../_components/ui/IconSquare'

interface Card {
  id: string
  front: string
  back: string
}

interface Props {
  cards: Card[]
}

export function FilterableCardsList({ cards }: Props) {
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCards = useMemo(() => {
    if (!searchTerm.trim()) return cards
    const query = searchTerm.toLowerCase().trim()
    return cards.filter(
      (card) =>
        card.front.toLowerCase().includes(query) ||
        card.back.toLowerCase().includes(query)
    )
  }, [cards, searchTerm])

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Słówka ({filteredCards.length})
        </h2>
      </div>

      {/* Search/Filter Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          placeholder="Szukaj słówek..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input w-full pl-9"
        />
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {searchTerm ? 'Nie znaleziono słówek' : 'Brak kart. Dodaj pierwszą kartę poniżej.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 rounded-lg px-4 py-3"
              style={{ border: '1px solid var(--border)' }}
            >
              <IconSquare variant="muted" size={32}>
                <span className="text-xs font-semibold">
                  {card.front.charAt(0).toUpperCase()}
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
              <div className="flex items-center gap-2" style={{ color: 'var(--text-soft)' }}>
                <button
                  type="button"
                  className="hover:opacity-70"
                  aria-label="Ulubione"
                >
                  <Star size={16} />
                </button>
                <button
                  type="button"
                  className="hover:opacity-70"
                  aria-label="Dźwięk"
                >
                  <Volume2 size={16} />
                </button>
                <button
                  type="button"
                  className="hover:opacity-70"
                  aria-label="Edytuj"
                >
                  <Pencil size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
