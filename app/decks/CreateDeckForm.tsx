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
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-3">
      <h3 className="font-semibold">Create New Deck</h3>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Deck name"
        required
        className="w-full border rounded px-3 py-2"
      />
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full border rounded px-3 py-2"
      />
      <button type="submit" disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
        {loading ? 'Creating...' : 'Create Deck'}
      </button>
    </form>
  )
}
