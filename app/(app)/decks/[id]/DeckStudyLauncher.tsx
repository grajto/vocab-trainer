'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSound } from '@/src/lib/SoundProvider'
import { Card } from '@/src/components/Card'
import { Button } from '@/src/components/Button'
import { Modal } from '@/src/components/Modal'
import { Toggle } from '@/src/components/Toggle'

interface Props {
  deckId: string
  cardCount: number
}

export function DeckStudyLauncher({ deckId, cardCount }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [selectedMode, setSelectedMode] = useState<string | null>(null)
  const [showConfig, setShowConfig] = useState(false)
  const [targetCount, setTargetCount] = useState(Math.min(cardCount, 13))
  const [multipleChoice, setMultipleChoice] = useState(true)
  const [written, setWritten] = useState(true)
  const [loading, setLoading] = useState(false)

  const modes = [
    { mode: 'translate', label: 'Learn', desc: 'Single-card written response' },
    { mode: 'abcd', label: 'Test', desc: 'Single-card multiple choice' },
    { mode: 'sentence', label: 'Write', desc: 'Sentence-based card prompts' },
    { mode: 'mixed', label: 'Mixed', desc: 'Rotates across all styles' },
  ]

  async function handleStart() {
    if (!selectedMode) return
    setLoading(true)
    unlock()

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode: selectedMode, targetCount, levelFilter: 'all', options: { multipleChoice, written } }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify(data.tasks))
        router.push(`/session/${data.sessionId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="p-4 lg:p-6">
        <h2 className="mb-4 text-2xl font-semibold text-vt-text">Choose mode</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {modes.map(mode => (
            <button
              key={mode.mode}
              onClick={() => setSelectedMode(mode.mode)}
              className={`rounded-vt border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary ${selectedMode === mode.mode ? 'border-vt-primary bg-vt-soft' : 'border-vt-border bg-vt-surface hover:border-vt-primary/60'}`}
            >
              <p className="text-xl font-semibold text-vt-text">{mode.label}</p>
              <p className="mt-1 text-sm text-vt-muted">{mode.desc}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled={!selectedMode} onClick={() => setShowConfig(true)}>Configure test</Button>
        </div>
      </Card>

      <Modal open={showConfig} onClose={() => setShowConfig(false)} title="Test options">
        <div className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-vt-muted">Questions ({Math.min(cardCount, 50)} max)</span>
            <input
              type="range"
              min={5}
              max={Math.min(cardCount, 50)}
              value={targetCount}
              onChange={e => setTargetCount(Number(e.target.value))}
              className="w-full accent-[#4255FF]"
            />
            <span className="text-sm text-vt-text">{targetCount}</span>
          </label>
          <Toggle checked={multipleChoice} onChange={setMultipleChoice} label="Multiple-choice questions" />
          <Toggle checked={written} onChange={setWritten} label="Written questions" />
          <div className="flex justify-end">
            <Button onClick={handleStart} disabled={loading}>{loading ? 'Starting…' : 'Start test'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
