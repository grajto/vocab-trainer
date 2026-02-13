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
    <form onSubmit={handleSubmit} className="rounded-[var(--card-radius)] p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>New Deck</p>
      {error && <p className="text-sm rounded-lg px-3 py-2" style={{ color: 'var(--danger)', background: 'var(--danger-soft)', border: '1px solid var(--danger)' }}>{error}</p>}
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Deck name"
        required
        className="w-full border border-[var(--border)] rounded-[var(--chip-radius)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="w-full border border-[var(--border)] rounded-[var(--chip-radius)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none transition-colors"
      />
      <button type="submit" disabled={loading} className="bg-[var(--primary)] text-white text-sm px-4 py-2 rounded-[var(--chip-radius)] hover:brightness-90 disabled:opacity-50 transition-colors">
        {loading ? 'Creating…' : 'Create Deck'}
      </button>
    </form>
  )
}
