'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

interface StarToggleProps {
  cardId: string
  initialStarred: boolean
  onToggle?: (starred: boolean) => void
  className?: string
}

export function StarToggle({ cardId, initialStarred, onToggle, className = '' }: StarToggleProps) {
  const [starred, setStarred] = useState(initialStarred)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return

    const newStarred = !starred
    setLoading(true)

    try {
      const response = await fetch(`/api/cards/${cardId}/star`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starred: newStarred }),
      })

      if (response.ok) {
        setStarred(newStarred)
        onToggle?.(newStarred)
      } else {
        console.error('Failed to toggle star')
      }
    } catch (error) {
      console.error('Error toggling star:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`transition-all ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'} ${className}`}
      title={starred ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
      aria-label={starred ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}
    >
      <Star
        className={`w-5 h-5 ${starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
      />
    </button>
  )
}
