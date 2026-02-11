'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Grid3X3, Layers, ListChecks, MessageSquare, Rocket, Shapes } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'

interface Props {
  deckId: string
  cardCount: number
}

type StudyMode = 'translate' | 'abcd' | 'sentence' | 'describe' | 'mixed' | 'test'

const modes = [
  { id: 'abcd' as const, label: 'ABCD', icon: Grid3X3, color: 'var(--primary)' },
  { id: 'translate' as const, label: 'Tłumaczenie', icon: Layers, color: 'var(--primary)' },
  { id: 'sentence' as const, label: 'Zdania', icon: MessageSquare, color: 'var(--primary)' },
  { id: 'describe' as const, label: 'Opisz', icon: Rocket, color: 'var(--primary)' },
  { id: 'mixed' as const, label: 'Mix', icon: Shapes, color: 'var(--primary)' },
  { id: 'test' as const, label: 'Test', icon: ListChecks, color: 'var(--warning)', highlight: true },
]

export function QuickModeButtons({ deckId, cardCount }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleStart(mode: StudyMode) {
    setLoading(mode)
    unlock()

    try {
      const targetCount = Math.min(cardCount, 20)
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
        router.push(`/session/${data.sessionId}`)
      }
    } catch (err) {
      console.error('Failed to start session:', err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isLoading = loading === mode.id
        const isTest = mode.highlight

        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => handleStart(mode.id)}
            disabled={isLoading || cardCount === 0}
            className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isTest ? '#fff8dd' : 'var(--surface)',
              border: `1px solid ${isTest ? 'var(--warning)' : 'var(--border)'}`,
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: isTest ? 'var(--warning)' : 'var(--primary-soft)' }}
            >
              <Icon size={20} style={{ color: isTest ? '#fff' : mode.color }} />
            </div>
            <span
              className="text-xs font-semibold"
              style={{ color: isTest ? 'var(--warning)' : 'var(--text)' }}
            >
              {isLoading ? 'Ładowanie...' : mode.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
