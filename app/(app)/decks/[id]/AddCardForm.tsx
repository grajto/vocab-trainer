'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddCardForm({ deckId }: { deckId: string }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [cardType, setCardType] = useState<'word' | 'phrase' | 'sentence'>('word')
  const [sentence, setSentence] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    if (cardType === 'sentence' && !sentence.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deckId,
          front,
          back,
          cardType,
          examples: cardType === 'sentence' ? sentence : '',
        }),
      })

      if (res.ok) {
        setFront('')
        setBack('')
        setSentence('')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to add card')
      }
    } catch (err) {
      console.error('Failed to add card:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius)] p-5 space-y-4"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Dodaj pojęcie
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Krótkie etykiety i czyste pola
          </p>
        </div>
        <div className="flex gap-1">
          {(['word', 'phrase', 'sentence'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCardType(t)}
              className={`text-xs px-2.5 py-1 rounded-[var(--radiusSm)] transition-colors capitalize ${
                cardType === t ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface2)] text-[var(--muted)]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p
          className="text-sm rounded-[var(--radiusSm)] px-3 py-2"
          style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}
        >
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Przód
          <input
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            placeholder={cardType === 'sentence' ? 'Słowo kluczowe' : 'Wyrażenie źródłowe'}
            required
            className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
          />
        </label>
        <label className="space-y-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Tył
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder={cardType === 'sentence' ? 'Tłumaczenie' : 'Znaczenie'}
            required
            className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
          />
        </label>
      </div>

      {cardType === 'sentence' && (
        <label className="space-y-1 text-xs font-medium block" style={{ color: 'var(--text-muted)' }}>
          Przykład
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="Dodaj zdanie z użyciem słowa…"
            required
            rows={2}
            className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none resize-none transition-colors"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] text-white text-sm px-4 py-2 rounded-[var(--radiusSm)] hover:brightness-90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Dodawanie…' : 'Dodaj słówko'}
      </button>
    </form>
  )
}
