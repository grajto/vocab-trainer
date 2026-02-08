'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddCardForm({ deckId }: { deckId: string }) {
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, front, back }),
      })

      if (res.ok) {
        setFront('')
        setBack('')
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to add card:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
      <h3 className="font-semibold">Add Card</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={front}
          onChange={e => setFront(e.target.value)}
          placeholder="Front (e.g., English)"
          required
          className="flex-1 border rounded px-3 py-2"
        />
        <input
          type="text"
          value={back}
          onChange={e => setBack(e.target.value)}
          placeholder="Back (e.g., Polish)"
          required
          className="flex-1 border rounded px-3 py-2"
        />
      </div>
      <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
        {loading ? 'Adding...' : 'Add Card'}
      </button>
    </form>
  )
}
