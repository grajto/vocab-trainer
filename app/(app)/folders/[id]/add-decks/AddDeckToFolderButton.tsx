'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus } from 'lucide-react'

export function AddDeckToFolderButton({ deckId, folderId }: { deckId: string; folderId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    setLoading(true)
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId }),
      })
      
      if (!res.ok) {
        throw new Error('Failed to add deck to folder')
      }
      
      router.refresh()
    } catch (err) {
      console.error('Error adding deck to folder:', err)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors disabled:opacity-50"
      style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
    >
      <FolderPlus size={14} />
      {loading ? 'Dodawanie…' : 'Dodaj do folderu'}
    </button>
  )
}
