'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Grid3X3, Layers, ListChecks, MessageSquare, Rocket, Shapes } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'

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

export function FolderQuickModeButtons({ folderId, cardCount }: { folderId: string; cardCount: number }) {
  const router = useRouter()
  const { unlock } = useSound()
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null)
  const [selectedCount, setSelectedCount] = useState<number | null>(null)
  const [customCount, setCustomCount] = useState('')
  const [showTestModal, setShowTestModal] = useState(false)
  const [testCount, setTestCount] = useState(20)
  const [enabledModes, setEnabledModes] = useState<string[]>(['abcd', 'translate'])
  const [randomQuestionOrder, setRandomQuestionOrder] = useState(true)
  const [randomAnswerOrder, setRandomAnswerOrder] = useState(true)
  const [useAllWords, setUseAllWords] = useState(false)

  async function startSession(mode: StudyMode, target: number, extra?: Record<string, unknown>) {
    setLoading(true)
    unlock()
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ folderId, mode, targetCount: target, ...extra }),
      })
      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode, returnDeckId: '' }))
        router.push(`/session/${data.sessionId}`)
      }
    } catch (err) {
      console.error('Failed to start folder session:', err)
    } finally {
      setLoading(false)
      setShowTestModal(false)
    }
  }

  async function handleStart() {
    if (!selectedMode || !selectedCount) return
    const targetCount = Math.min(cardCount, selectedCount)
    await startSession(selectedMode, targetCount)
  }

  function handleModeSelect(mode: StudyMode) {
    if (mode === 'test') {
      setSelectedMode('test')
      setShowTestModal(true)
    } else {
      setSelectedMode(mode)
      setSelectedCount(null)
      setCustomCount('')
      if (cardCount > 0 && cardCount < cardCountOptions[0]) {
        setSelectedCount(cardCount)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Szybki start (folder)
        </h3>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{cardCount} słówek</p>
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
                  onClick={() => {
                    setSelectedCount(count)
                    setCustomCount('')
                  }}
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
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCount(cardCount)
                setCustomCount('')
              }}
              disabled={loading || cardCount === 0}
              className="rounded-xl px-4 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                border: `1px solid ${selectedCount === cardCount ? 'var(--primary)' : 'var(--border)'}`,
                background: selectedCount === cardCount ? 'var(--primary-soft)' : 'var(--surface)',
                color: selectedCount === cardCount ? 'var(--primary)' : 'var(--text)',
              }}
            >
              Wszystkie ({cardCount})
            </button>
            <label
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              Custom
              <input
                type="number"
                min={1}
                max={cardCount}
                value={customCount}
                onChange={(e) => {
                  const value = e.target.value
                  setCustomCount(value)
                  const parsed = Number(value)
                  if (Number.isFinite(parsed) && parsed > 0) {
                    setSelectedCount(Math.min(cardCount, parsed))
                  }
                }}
                className="w-full rounded-lg border px-3 py-1 text-sm focus:outline-none"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              />
            </label>
          </div>
        </div>
      )}

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
            <div className="space-y-3 text-xs" style={{ color: 'var(--text)' }}>
              <label className="space-y-1 font-medium">
                Liczba pytań
                <input
                  type="number"
                  min={5}
                  max={35}
                  value={testCount}
                  onChange={(e) => setTestCount(Number(e.target.value))}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none"
                  style={{ borderColor: 'var(--border)' }}
                  disabled={useAllWords}
                />
              </label>
              <label className="flex items-center gap-2 font-medium">
                <input type="checkbox" checked={useAllWords} onChange={(e) => setUseAllWords(e.target.checked)} />
                Wszystkie słowa w folderze
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['abcd', 'translate'].map(mode => (
                  <label key={mode} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enabledModes.includes(mode)}
                      onChange={(e) => setEnabledModes(prev => e.target.checked ? [...new Set([...prev, mode])] : prev.filter(m => m !== mode))}
                    />
                    <span>{mode === 'abcd' ? 'ABCD' : mode === 'translate' ? 'Tłumaczenie' : mode === 'sentence' ? 'Zdanie' : 'Opis'}</span>
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={randomQuestionOrder} onChange={(e) => setRandomQuestionOrder(e.target.checked)} />
                Losowa kolejność pytań
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={randomAnswerOrder}
                  onChange={(e) => setRandomAnswerOrder(e.target.checked)}
                  disabled={!enabledModes.includes('abcd')}
                />
                Losowa kolejność odpowiedzi (ABCD)
              </label>
            </div>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  const target = useAllWords ? cardCount : Math.max(5, Math.min(35, testCount))
                  await startSession('test', target, {
                    enabledModes,
                    shuffle: randomQuestionOrder,
                    randomAnswerOrder,
                  })
                }}
                className="w-full rounded-full py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--primary)' }}
                disabled={loading || !enabledModes.length}
              >
                {loading ? 'Ładowanie…' : 'Szybki test'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/test?source=folder&folderId=${folderId}`)}
                className="w-full rounded-full py-2 text-sm font-semibold"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                disabled={loading}
              >
                Pełny kreator
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
