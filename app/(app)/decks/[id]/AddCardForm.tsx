'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddCardForm({ deckId }: { deckId: string }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [bulk, setBulk] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!bulk.trim() && (!front.trim() || !back.trim())) return
    setLoading(true)
    setError('')

    try {
      if (bulk.trim()) {
        const lines = bulk.split('\n').map((l) => l.trim()).filter(Boolean)
        for (const line of lines) {
          const parts = line.split(/\t|;| - /)
          if (parts.length < 2) continue
          const f = parts[0]
          const b = parts.slice(1).join(' - ')
          if (!f || !b) continue
          await fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deckId,
              front: f,
              back: b,
              cardType: 'word',
              examples: '',
            }),
          })
        }
        setBulk('')
        setFront('')
        setBack('')
        router.refresh()
      } else {
        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            deckId,
            front,
            back,
            cardType: 'word',
            examples: '',
          }),
        })

        if (res.ok) {
          setFront('')
          setBack('')
          router.refresh()
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.error || 'Failed to add card')
        }
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
      className="rounded-[var(--card-radius)] p-5 space-y-4"
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
        <a href="/import" className="text-xs font-semibold" style={{ color: 'var(--primary)' }}>
          Importuj
        </a>
      </div>

      {error && (
        <p
          className="text-sm rounded-[var(--chip-radius)] px-3 py-2"
          style={{ color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}
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
            placeholder="Wyrażenie źródłowe"
            required={!bulk.trim()}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          />
        </label>
        <label className="space-y-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Tył
          <input
            type="text"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            placeholder="Znaczenie"
            required={!bulk.trim()}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          />
        </label>
      </div>

      <label className="space-y-1 text-xs font-medium block" style={{ color: 'var(--text-muted)' }}>
        Hurtowe dodawanie (linia: przód;tył)
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder="hello;witaj\nbook;książka"
          rows={4}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] resize-none transition-colors"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primary)] text-white text-sm px-4 py-2 rounded-[var(--chip-radius)] hover:brightness-90 disabled:opacity-50 transition-colors"
      >
        {loading ? 'Dodawanie…' : 'Dodaj słówko / hurtowo'}
      </button>
    </form>
  )
}
