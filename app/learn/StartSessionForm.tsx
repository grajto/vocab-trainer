'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSoundManager } from '@/src/lib/soundManager'

type Deck = { id: string; name: string }

export function StartSessionForm({ decks }: { decks: Deck[] }) {
  const [deckId, setDeckId] = useState(decks[0]?.id || '')
  const [mode, setMode] = useState('translate')
  const [direction, setDirection] = useState<'forward' | 'reverse' | 'mixed'>('forward')
  const [targetCount, setTargetCount] = useState(10)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await getSoundManager().unlock()
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount, direction }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
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
    <form onSubmit={handleStart} className="bg-white border border-neutral-200 rounded-xl p-6 space-y-5">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Deck</label>
        <select value={deckId} onChange={e => setDeckId(e.target.value)} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none bg-white">
          {decks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none bg-white">
          <option value="translate">Translate (typed answer)</option>
          <option value="abcd">ABCD (multiple choice)</option>
          <option value="sentence">Sentence (use word in sentence)</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1.5">Direction</label>
        <select value={direction} onChange={e => setDirection(e.target.value as 'forward' | 'reverse' | 'mixed')} className="w-full border border-neutral-200 rounded-lg px-3 py-2.5 text-sm focus:border-neutral-900 focus:outline-none bg-white">
          <option value="forward">PL → EN</option>
          <option value="reverse">EN → PL</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-neutral-500 mb-1.5">
          Cards: <span className="text-neutral-900 font-semibold">{targetCount}</span>
        </label>
        <input
          type="range"
          min={5}
          max={35}
          value={targetCount}
          onChange={e => setTargetCount(Number(e.target.value))}
          className="w-full accent-neutral-900"
        />
        <div className="flex justify-between text-[10px] text-neutral-400 mt-1">
          <span>5</span>
          <span>35</span>
        </div>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 transition-colors">
        {loading ? 'Starting…' : 'Start Session'}
      </button>
    </form>
  )
}
