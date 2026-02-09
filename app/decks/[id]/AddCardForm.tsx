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
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-900">Add Card</p>
        <div className="flex gap-1">
          {(['word', 'phrase', 'sentence'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setCardType(t)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors capitalize ${
                cardType === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <input
          type="text"
          value={front}
          onChange={e => setFront(e.target.value)}
          placeholder={cardType === 'sentence' ? 'Target word (e.g. however)' : 'Front (e.g. English)'}
          required
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
        />
        <input
          type="text"
          value={back}
          onChange={e => setBack(e.target.value)}
          placeholder={cardType === 'sentence' ? 'Translation (e.g. jednakże)' : 'Back (e.g. Polish)'}
          required
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none transition-colors"
        />
      </div>

      {cardType === 'sentence' && (
        <textarea
          value={sentence}
          onChange={e => setSentence(e.target.value)}
          placeholder="Example sentence using the target word…"
          required
          rows={2}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none resize-none transition-colors"
        />
      )}

      <button type="submit" disabled={loading} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
        {loading ? 'Adding…' : 'Add Card'}
      </button>
    </form>
  )
}
