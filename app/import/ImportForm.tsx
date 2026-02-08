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
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Deck</label>
        <select value={deckId} onChange={e => setDeckId(e.target.value)} className="w-full border rounded px-3 py-2">
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">CSV Data</label>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={"front,back,notes\nhello,cześć,greeting\ndog,pies,animal"}
          rows={8}
          className="w-full border rounded px-3 py-2 font-mono text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Columns: front, back, notes (optional), examples (optional)</p>
      </div>
      <button type="submit" disabled={loading} className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Importing...' : 'Import'}
      </button>

      {result && (
        <div className="p-4 bg-gray-100 rounded text-sm">
          <p className="text-green-700">Created: {result.createdCount}</p>
          <p className="text-yellow-700">Skipped (duplicates): {result.skippedCount}</p>
          {result.errors.length > 0 && (
            <div className="text-red-600 mt-2">
              {result.errors.map((err, i) => <p key={i}>{err}</p>)}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
