'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateDeckForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })

      if (res.ok) {
        setName('')
        setDescription('')
        router.refresh()
      }
    } catch (err) {
      console.error('Failed to create deck:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
      <p className="text-sm font-medium">New Deck</p>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Deck name"
        required
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
      />
      <button type="submit" disabled={loading} className="bg-neutral-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors">
        {loading ? 'Creating…' : 'Create Deck'}
      </button>
    </form>
  )
}
