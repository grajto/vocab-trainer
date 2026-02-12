'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Grid3X3, Layers, ListChecks, Rocket, Shapes, SpellCheck, type LucideIcon } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'

interface Props {
  deckId: string
  cardCount: number
}

type StudyMode = 'translate' | 'abcd' | 'sentence' | 'describe' | 'mixed' | 'test'

const modeTiles: Array<{ id: StudyMode; label: string; icon: LucideIcon }> = [
  { id: 'translate', label: 'Fiszki', icon: Layers },
  { id: 'sentence', label: 'Ucz się', icon: SpellCheck },
  { id: 'test', label: 'Test', icon: ListChecks },
  { id: 'abcd', label: 'ABCD', icon: Grid3X3 },
  { id: 'describe', label: 'Opisz słowo (AI)', icon: Rocket },
  { id: 'mixed', label: 'Mixed', icon: Shapes },
]

export function DeckStudyLauncher({ deckId, cardCount }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [mode, setMode] = useState<StudyMode>('test')
  const [targetCount, setTargetCount] = useState(Math.min(cardCount, 20))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStart() {
    if (mode === 'test') {
      router.push(`/test?source=set&deckId=${deckId}`)
      return
    }

    setLoading(true)
    setError('')
    unlock()

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode, returnDeckId: deckId }))
        router.push(`/session/${data.sessionId}`)
      } else {
        setError(data.error || 'Nie udało się uruchomić sesji')
      }
    } catch {
      setError('Błąd sieci')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="space-y-4">
      {/* Mode tiles */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {modeTiles.map(tile => {
          const Icon = tile.icon
          const selected = mode === tile.id
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setMode(tile.id)}
              className="flex flex-col items-center gap-1.5 rounded-lg px-2 py-3 text-xs font-medium transition-colors"
              style={{
                background: selected ? 'var(--primaryBg)' : 'var(--surface)',
                border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                color: selected ? 'var(--primary)' : 'var(--muted)',
              }}
            >
              <Icon size={18} />
              <span>{tile.label}</span>
            </button>
          )
        })}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <label htmlFor="deck-word-count" className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--muted)' }}>Liczba słówek</label>
          <input
            id="deck-word-count"
            type="number"
            min={5}
            max={Math.min(35, cardCount)}
            value={targetCount}
            onChange={e => setTargetCount(Math.max(5, Math.min(Number(e.target.value || 20), Math.min(35, cardCount))))}
            className="h-10 w-full rounded-lg px-3 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <button
          type="button"
          onClick={handleStart}
          disabled={loading || cardCount === 0}
          className="h-10 rounded-lg px-5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: 'var(--primary)' }}
        >
          {loading ? 'Uruchamianie…' : `Szybki trening (${targetCount})`}
        </button>
      </div>

      {error ? <p className="rounded-lg px-3 py-2 text-sm text-red-600" style={{ background: '#fef2f2' }}>{error}</p> : null}
    </section>
  )
}
