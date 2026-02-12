'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  cardId: string
  initialStarred: boolean
  className?: string
}

export function StarToggle({ cardId, initialStarred, className = '' }: Props) {
  const router = useRouter()
  const [starred, setStarred] = useState(initialStarred)
  const [loading, setLoading] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    
    if (loading) return
    
    const newStarred = !starred
    setStarred(newStarred) // Optimistic update
    setLoading(true)

    try {
      const res = await fetch(`/api/cards/${cardId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ starred: newStarred }),
      })

      if (!res.ok) {
        // Revert on error
        setStarred(!newStarred)
      } else {
        router.refresh()
      }
    } catch (error) {
      // Revert on error
      setStarred(!newStarred)
      console.error('Failed to toggle star:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center justify-center transition-colors disabled:opacity-50 ${className}`}
      title={starred ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      aria-label={starred ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
    >
      <Star
        size={20}
        fill={starred ? '#FCD34D' : 'none'}
        stroke={starred ? '#FCD34D' : 'currentColor'}
        strokeWidth={2}
      />
    </button>
  )
}
