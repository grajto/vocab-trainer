'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSound } from '@/src/lib/SoundProvider'

interface Props {
  deckId: string
  cardCount: number
}

export function DeckStudyLauncher({ deckId, cardCount }: Props) {
  const router = useRouter()
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [targetCount, setTargetCount] = useState(Math.min(cardCount, 10))
  const [levelFilter, setLevelFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { unlock } = useSound()

  const modes = [
    { mode: 'translate', label: 'Learn', icon: '📖', color: 'from-blue-500 to-violet-500', desc: 'Type translations' },
    { mode: 'abcd', label: 'Test', icon: '✅', color: 'from-emerald-500 to-teal-500', desc: 'Multiple choice' },
    { mode: 'sentence', label: 'Sentences', icon: '✍️', color: 'from-amber-500 to-orange-500', desc: 'Write sentences' },
    { mode: 'mixed', label: 'Mixed', icon: '🔀', color: 'from-rose-500 to-pink-500', desc: 'All modes combined' },
  ]

  async function handleStart() {
    if (!selectedMode) return
    setLoading(true)
    setError('')
    unlock()

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode: selectedMode, targetCount, levelFilter }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
        router.push(`/session/${data.sessionId}`)
      } else {
        setError(data.error || 'Failed to start session')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {modes.map(m => (
          <button
            key={m.mode}
            onClick={() => setSelectedMode(selectedMode === m.mode ? null : m.mode)}
            className={`bg-gradient-to-br ${m.color} text-white rounded-2xl p-6 text-center transition-all shadow-md ${
              selectedMode === m.mode ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.05]' : 'hover:opacity-90 hover:scale-[1.02]'
            }`}
          >
            <span className="text-4xl block mb-2">{m.icon}</span>
            <span className="text-sm font-medium block">{m.label}</span>
            <span className="text-[10px] opacity-70">{m.desc}</span>
          </button>
        ))}
      </div>

      {/* Session settings - show when mode selected */}
      {selectedMode && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Cards: <span className="text-blue-600 font-semibold">{targetCount}</span>
              </label>
              <input
                type="range"
                min={5}
                max={Math.min(cardCount, 35)}
                value={targetCount}
                onChange={e => setTargetCount(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>5</span>
                <span>{Math.min(cardCount, 35)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Card Level</label>
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none bg-white transition-colors"
              >
                <option value="all">All levels</option>
                <option value="1">Level 1 (new)</option>
                <option value="2-3">Level 2-3 (learning)</option>
                <option value="4">Level 4 (mastered)</option>
                <option value="problematic">Problematic (most errors)</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white py-4 rounded-2xl text-sm font-medium hover:from-blue-700 hover:to-violet-700 disabled:opacity-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? 'Starting…' : `Start ${modes.find(m => m.mode === selectedMode)?.label || 'Session'}`}
          </button>
        </div>
      )}
    </div>
  )
}
