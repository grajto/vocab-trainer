'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateDeckForm() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')

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
      } else {
        if (res.status === 401) {
          setError('Please sign in to create a deck.')
          router.push('/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to create deck')
      }
    } catch (err) {
      console.error('Failed to create deck:', err)
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
      <p className="text-sm font-medium text-slate-900">New Deck</p>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Deck name"
        required
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
      />
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
      />
      <button type="submit" disabled={loading} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-2xl hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all">
        {loading ? 'Creating…' : 'Create Deck'}
      </button>
    </form>
  )
}
