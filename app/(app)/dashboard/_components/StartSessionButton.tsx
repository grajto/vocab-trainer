'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../_components/ui/Button'
import { useSound } from '@/src/lib/SoundProvider'

interface Props {
  deckId: string
  mode: string
  targetCount: number
  direction: string
}

export function StartSessionButton({ deckId, mode, targetCount, direction }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [loading, setLoading] = useState(false)

  async function handleStart() {
    setLoading(true)
    unlock()

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount, direction }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode, returnDeckId: deckId }))
        router.push(`/session/${data.sessionId}`)
      }
    } catch (err) {
      console.error('Failed to start session:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="primary" 
      className="w-full" 
      onClick={handleStart}
      disabled={loading}
    >
      {loading ? 'Ładowanie...' : 'Rozpocznij'}
    </Button>
  )
}
