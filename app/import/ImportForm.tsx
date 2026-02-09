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

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Deck</label>
        <select value={deckId} onChange={e => setDeckId(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white">
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">CSV Data</label>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={"front,back,notes\nhello,cześć,greeting\ndog,pies,animal"}
          rows={8}
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:border-indigo-500 focus:outline-none"
        />
        <p className="text-[10px] text-slate-400 mt-1.5">Columns: front, back, notes (optional), examples (optional)</p>
      </div>
      <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all">
        {loading ? 'Importing…' : 'Import'}
      </button>

      {result && (
        <div className="border border-slate-200 rounded-lg p-4 space-y-1 text-sm">
          <p className="text-emerald-600">Created: {result.createdCount}</p>
          {result.skippedCount > 0 && <p className="text-amber-600">Skipped: {result.skippedCount}</p>}
          {result.errors.length > 0 && (
            <div className="text-red-600 mt-2 space-y-0.5">
              {result.errors.map((err, i) => <p key={i} className="text-xs">{err}</p>)}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
