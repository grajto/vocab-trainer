'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Deck = { id: string; name: string }

export function StartSessionForm({ decks }: { decks: Deck[] }) {
  const [deckId, setDeckId] = useState(decks[0]?.id || '')
  const [mode, setMode] = useState('translate')
  const [targetCount, setTargetCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        // Store tasks in sessionStorage for the session page
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
        router.push(`/session/${data.sessionId}`)
      } else {
        setError(data.error || 'Failed to start session')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleStart} className="bg-white p-6 rounded-lg shadow space-y-4">
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Deck</label>
        <select value={deckId} onChange={e => setDeckId(e.target.value)} className="w-full border rounded px-3 py-2">
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="w-full border rounded px-3 py-2">
          <option value="translate">Translate (typed answer)</option>
          <option value="abcd">ABCD (multiple choice)</option>
          <option value="sentence">Sentence (use word in sentence)</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Number of cards: {targetCount}</label>
        <input
          type="range"
          min={5}
          max={35}
          value={targetCount}
          onChange={e => setTargetCount(Number(e.target.value))}
          className="w-full"
        />
      </div>
      <button type="submit" disabled={loading} className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50">
        {loading ? 'Starting...' : 'Start Session'}
      </button>
    </form>
  )
}
