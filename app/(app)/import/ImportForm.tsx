'use client'

import { useState } from 'react'

type Deck = { id: string; name: string }

export function ImportForm({ decks }: { decks: Deck[] }) {
  const [deckId, setDeckId] = useState(decks[0]?.id || '')
  const [csvText, setCsvText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number; errors: string[] } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!csvText.trim()) return
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, csvText }),
      })

      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ createdCount: 0, skippedCount: 0, errors: ['Network error'] })
    } finally {
      setLoading(false)
    }
  }

  const selectClass = "w-full h-12 rounded-xl px-4 text-base focus:outline-none"
  const selectStyle = { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl p-8" style={{ border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
      {/* Deck selector */}
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Docelowy zestaw</label>
        <select value={deckId} onChange={e => setDeckId(e.target.value)} className={selectClass} style={selectStyle}>
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {/* CSV textarea */}
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Dane CSV</label>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={"front,back,notes\nhello,cześć,greeting\ndog,pies,animal"}
          rows={10}
          className="w-full rounded-xl px-4 py-3 font-mono text-base leading-relaxed focus:outline-none"
          style={{ border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
        />
        <p className="mt-1.5 text-xs" style={{ color: 'var(--gray400)' }}>Kolumny: front, back, notes (opcja), examples (opcja)</p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-2xl text-base font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #4255ff 0%, #7c3aed 100%)', boxShadow: '0 4px 12px rgba(66, 85, 255, 0.3)' }}
      >
        {loading ? 'Importowanie…' : 'Importuj'}
      </button>

      {/* Result */}
      {result && (
        <div className="space-y-1 rounded-lg p-4 text-sm" style={{ border: '1px solid var(--border)' }}>
          <p style={{ color: '#059669' }}>Utworzono: {result.createdCount}</p>
          {result.skippedCount > 0 && <p style={{ color: '#d97706' }}>Pominięto: {result.skippedCount}</p>}
          {result.errors.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {result.errors.map((err, i) => <p key={i} className="text-xs" style={{ color: '#dc2626' }}>{err}</p>)}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
