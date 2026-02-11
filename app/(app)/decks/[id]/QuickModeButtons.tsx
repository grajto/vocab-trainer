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

const cardCountOptions = [10, 15, 20, 25, 30, 35]

export function QuickModeButtons({ deckId, cardCount }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null)
  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [showTestModal, setShowTestModal] = useState(false)
  const [testCount, setTestCount] = useState(20)

  async function handleStart() {
    if (!selectedMode || !selectedCount) return
    
    setLoading(true)
    unlock()

    try {
      const targetCount = Math.min(cardCount, selectedCount)
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode: selectedMode, targetCount }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
        router.push(`/session/${data.sessionId}`)
      }
    } catch (err) {
      console.error('Failed to start session:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleModeSelect(mode: StudyMode) {
    if (mode === 'test') {
      setSelectedMode('test')
      setShowTestModal(true)
    } else {
      // For other modes, show card count selection
      setSelectedMode(mode)
      setSelectedCount(null)
    }
  }

  function handleCountSelect(count: number) {
    setSelectedCount(count)
  }

  function handleReset() {
    setSelectedMode(null)
    setSelectedCount(null)
  }

  return (
    <div className="space-y-4 relative z-0">
      {/* Mode selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Wybierz tryb
          </h3>
          {selectedMode && selectedMode !== 'test' && (
            <button
              onClick={handleReset}
              className="text-xs font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Zmień tryb
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {modes.map((mode) => {
            const Icon = mode.icon
            const isTest = mode.highlight
            const isSelected = selectedMode === mode.id

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleModeSelect(mode.id)}
                disabled={loading || cardCount === 0 || (selectedMode !== null && selectedMode !== mode.id)}
                className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isTest ? '#fff8dd' : isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                  border: `1px solid ${isTest ? 'var(--warning)' : isSelected ? 'var(--primary)' : 'var(--border)'}`,
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
                  {loading && selectedMode === mode.id ? 'Ładowanie...' : mode.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Card count selection - shown after mode selection (except test) */}
      {selectedMode && selectedMode !== 'test' && (
        <div>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Wybierz liczbę słówek
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {cardCountOptions.map((count) => {
              const isAvailable = count <= cardCount
              const isSelected = selectedCount === count

              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handleCountSelect(count)}
                  disabled={!isAvailable || loading}
                  className="flex items-center justify-center rounded-xl p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <span
                    className="text-lg font-bold"
                    style={{ color: isSelected ? 'var(--primary)' : 'var(--text)' }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Start button - shown after both mode and count are selected */}
      {selectedMode && selectedMode !== 'test' && selectedCount && (
        <div>
          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full rounded-full py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {loading ? 'Ładowanie...' : 'Rozpocznij'}
          </button>
        </div>
      )}

      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Ustawienia testu</p>
              <button onClick={() => setShowTestModal(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>Zamknij</button>
            </div>
            <label className="space-y-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Liczba pytań
              <input
                type="number"
                min={5}
                max={35}
                value={testCount}
                onChange={(e) => setTestCount(Number(e.target.value))}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </label>
            <button
              type="button"
              onClick={async () => {
                setLoading(true)
                unlock()
                try {
                  const targetCount = Math.min(cardCount, testCount)
                  const res = await fetch('/api/session/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ deckId, mode: 'test', targetCount }),
                  })
                  const data = await res.json()
                  if (res.ok && data.sessionId) {
                    sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
                    router.push(`/session/${data.sessionId}`)
                  }
                } catch (err) {
                  console.error('Failed to start test:', err)
                } finally {
                  setLoading(false)
                  setShowTestModal(false)
                }
              }}
              className="w-full rounded-full py-2 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)' }}
              disabled={loading}
            >
              {loading ? 'Ładowanie…' : 'Start testu'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
