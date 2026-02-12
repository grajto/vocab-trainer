'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

export function AddDeckToFolderButton({ deckId, folderId }: { deckId: string; folderId: string }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId }),
      })
      if (!res.ok) {
        throw new Error('Nie udało się dodać')
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to add deck to folder:', err)
      setAdding(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={adding}
      className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-60 hover:opacity-90"
      style={{ background: 'var(--primary)', color: 'white' }}
    >
      <Plus size={12} />
      {adding ? 'Dodawanie…' : 'Dodaj'}
    </button>
  )
}
