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
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
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
    <section className="deck-train-shell">
      <div className="deck-mode-grid">
        {modeTiles.map(tile => {
          const Icon = tile.icon
          const selected = mode === tile.id
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setMode(tile.id)}
              className={`deck-mode-tile ${selected ? 'is-active' : ''}`}
            >
              <Icon size={18} className="deck-mode-icon" />
              <span>{tile.label}</span>
            </button>
          )
        })}
      </div>

      <div className="deck-train-controls">
        <label>
          Liczba słówek
          <input
            type="number"
            min={5}
            max={Math.min(35, cardCount)}
            value={targetCount}
            onChange={e => setTargetCount(Math.max(5, Math.min(Number(e.target.value || 20), Math.min(35, cardCount))))}
          />
        </label>

        <label>
          Tryb
          <select value={mode} onChange={e => setMode(e.target.value as StudyMode)}>
            <option value="translate">Wpisywanie</option>
            <option value="abcd">ABCD</option>
            <option value="sentence">Sentence</option>
            <option value="describe">Opisz słowo (AI)</option>
            <option value="mixed">Mixed</option>
            <option value="test">Test</option>
          </select>
        </label>

        <button type="button" onClick={handleStart} disabled={loading || cardCount === 0}>
          {loading ? 'Uruchamianie…' : `Szybki trening (${targetCount})`}
        </button>
      </div>

      {error ? <p className="deck-train-error">{error}</p> : null}
    </section>
  )
}
