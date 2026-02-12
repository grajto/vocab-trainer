'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Grid3X3, Layers, ListChecks, MessageSquare, Rocket, Shapes, X } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'

type StudyMode = 'translate' | 'abcd' | 'sentence' | 'describe' | 'mixed' | 'test'
type TestMode = 'abcd' | 'translate' | 'sentence' | 'describe'

const DEFAULT_TEST_MODE: TestMode = 'abcd'
const allowedTestModes: TestMode[] = ['abcd', 'translate']

const normalizeTestModes = (modes: unknown): TestMode[] => {
  if (!Array.isArray(modes)) return [DEFAULT_TEST_MODE]
  const filtered = modes.filter((mode): mode is TestMode => allowedTestModes.includes(mode as TestMode))
  return filtered.length ? filtered : [DEFAULT_TEST_MODE]
}

const modes = [
  { id: 'abcd' as const, label: 'ABCD', icon: Grid3X3, color: 'var(--primary)' },
  { id: 'translate' as const, label: 'Tłumaczenie', icon: Layers, color: 'var(--primary)' },
  { id: 'sentence' as const, label: 'Zdania', icon: MessageSquare, color: 'var(--primary)' },
  { id: 'describe' as const, label: 'Opisz', icon: Rocket, color: 'var(--primary)' },
  { id: 'mixed' as const, label: 'Mix', icon: Shapes, color: 'var(--primary)' },
  { id: 'test' as const, label: 'Test', icon: ListChecks, color: 'var(--warning)', highlight: true },
]

const cardCountOptions = [10, 15, 20, 25, 30, 35]
const PREF_KEY = 'test-prefs'

interface Props {
  deckId: string
  cardCount: number
}

export function QuickModeButtons({ deckId, cardCount }: Props) {
  const router = useRouter()
  const { unlock } = useSound()
  const [loading, setLoading] = useState(false)
  const [selectedMode, setSelectedMode] = useState<StudyMode | null>(null)
  const [selectedCount, setSelectedCount] = useState<number | null>(null)

  // Test modal state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testCount, setTestCount] = useState(20)
  const [enabledModes, setEnabledModes] = useState<TestMode[]>(allowedTestModes)
  const [randomizeQuestions, setRandomizeQuestions] = useState(true)
  const [randomizeAnswers, setRandomizeAnswers] = useState(true)
  const [starredOnly, setStarredOnly] = useState(false)
  const [answerLang, setAnswerLang] = useState('auto')
  const [allowTypos, setAllowTypos] = useState(true)
  const [requireSingle, setRequireSingle] = useState(false)
  const [useAllWords, setUseAllWords] = useState(false)
  const [minTypeHint, setMinTypeHint] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const modalRef = useRef<HTMLDivElement | null>(null)

  const clampedCount = useMemo(() => Math.min(Math.max(testCount, 5), Math.min(20, cardCount)), [testCount, cardCount])

  useEffect(() => {
    if (!showTestModal) return
    document.body.style.overflow = 'hidden'
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => modalRef.current?.focus(), 0)
    return () => {
      document.body.style.overflow = ''
      prev?.focus()
    }
  }, [showTestModal])

  useEffect(() => {
    // load from localStorage
    try {
      const raw = localStorage.getItem(PREF_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setTestCount(parsed.questionCount ?? 20)
        setStarredOnly(!!parsed.starredOnly)
        const modes = parsed.enabledModes?.length ? parsed.enabledModes : (parsed.enabledTypes?.length ? parsed.enabledTypes : allowedTestModes)
        setEnabledModes(normalizeTestModes(modes))
        setRandomizeQuestions(parsed.randomizeQuestions ?? true)
        setRandomizeAnswers(parsed.randomizeAnswers ?? true)
        setAnswerLang(parsed.answerLang ?? 'auto')
        setAllowTypos(parsed.correction?.allowTypos ?? true)
        setRequireSingle(parsed.correction?.requireSingle ?? false)
      }
    } catch {
      /* ignore */
    }

    // load from API
    const load = async () => {
      try {
        const res = await fetch('/api/user-test-preferences', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data) {
            setTestCount(data.questionCount ?? 20)
            setStarredOnly(!!data.starredOnly)
            const modes = Array.isArray(data.enabledModes) && data.enabledModes.length 
              ? data.enabledModes 
              : (Array.isArray(data.enabledTypes) && data.enabledTypes.length ? data.enabledTypes : allowedTestModes)
            setEnabledModes(normalizeTestModes(modes))
            setRandomizeQuestions(data.randomizeQuestions ?? true)
            setRandomizeAnswers(data.randomizeAnswers ?? true)
            const langs = Array.isArray(data.answerLanguages) && data.answerLanguages[0]?.lang
              ? data.answerLanguages.map((l: any) => l.lang)
              : data.answerLanguages ?? []
            setAnswerLang(langs[0] || 'auto')
            setAllowTypos(Boolean(data.correctionOptions?.allowTypos ?? true))
            setRequireSingle(Boolean(data.correctionOptions?.requireSingle ?? false))
          }
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingPrefs(false)
      }
    }
    load()
  }, [])

  function persistLocal() {
    const payload = {
      questionCount: clampedCount,
      starredOnly,
      enabledModes,
      randomizeQuestions,
      randomizeAnswers,
      answerLang,
      correction: { allowTypos, requireSingle },
    }
    localStorage.setItem(PREF_KEY, JSON.stringify(payload))
  }

  async function persistRemote() {
    setSavingPrefs(true)
    try {
      await fetch('/api/user-test-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          questionCount: clampedCount,
          starredOnly,
          enabledModes,
          randomizeQuestions,
          randomizeAnswers,
          answerLanguages: [answerLang].filter(Boolean),
          correctionOptions: { allowTypos, requireSingle },
        }),
      })
    } catch {
      /* ignore */
    } finally {
      setSavingPrefs(false)
    }
  }

  async function startSession(mode: StudyMode, target: number, settings?: any) {
    setLoading(true)
    unlock()
    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ deckId, mode, targetCount: target, settings }),
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

  async function handleStart() {
    if (!selectedMode || !selectedCount) return
    const targetCount = Math.min(cardCount, selectedCount)
    await startSession(selectedMode, targetCount)
  }

  function handleModeSelect(mode: StudyMode) {
    if (mode === 'test') {
      setShowTestModal(true)
      setSelectedMode(null)
      setSelectedCount(null)
      return
    } else {
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

  function toggleMode(mode: TestMode, next: boolean) {
    setEnabledModes((prev) => {
      let arr: TestMode[] = prev
      if (next && !prev.includes(mode)) arr = [...prev, mode]
      if (!next) arr = prev.filter((m) => m !== mode)
      if (!arr.length) {
        setMinTypeHint(true)
        return [DEFAULT_TEST_MODE]
      }
      setMinTypeHint(false)
      return arr
    })
  }

  async function handleCreateTest() {
    const poolEmpty = starredOnly && cardCount === 0
    if (poolEmpty) return
    const target = useAllWords ? cardCount : Math.min(cardCount, clampedCount)
    const selectedModes = normalizeTestModes(enabledModes)
    const settings = {
      modes: selectedModes,
      starredOnly,
      randomizeQuestions,
      randomizeAnswers,
      answerLang,
      correction: { allowTypos, requireSingle },
      questionCount: target,
    }
    persistLocal()
    await persistRemote()
    await startSession('test', target, settings)
    setShowTestModal(false)
    triggerRef.current?.focus()
  }

  return (
    <div className="space-y-4 relative z-0">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Wybierz tryb
          </h3>
          {selectedMode && (
            <button onClick={handleReset} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
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
                ref={mode.id === 'test' ? triggerRef : undefined}
                type="button"
                onClick={() => handleModeSelect(mode.id)}
                disabled={loading || cardCount === 0 || (selectedMode !== null && selectedMode !== mode.id)}
                className="flex flex-col items-center gap-2 rounded-xl p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isTest ? '#fff8dd' : isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                  border: `1px solid ${isTest ? 'var(--warning)' : isSelected ? 'var(--primary)' : 'var(--border)'}`,
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: isTest ? 'var(--warning)' : 'var(--primary-soft)' }}>
                  <Icon size={20} style={{ color: isTest ? '#fff' : mode.color }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: isTest ? 'var(--warning)' : 'var(--text)' }}>
                  {loading && isSelected ? 'Ładowanie...' : mode.label}
                </span>
              </button>
            )
          })}
        </div>
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
                  onClick={() => handleCountSelect(count)}
                  disabled={!isAvailable || loading}
                  className="flex items-center justify-center rounded-xl p-4 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                  }}
                >
                  <span className="text-lg font-bold" style={{ color: isSelected ? 'var(--primary)' : 'var(--text)' }}>
                    {count}
                  </span>
                </button>
              )
            })}
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

      {showTestModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[120] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowTestModal(false)
                handleReset()
                triggerRef.current?.focus()
              }
            }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <div
              ref={modalRef}
              tabIndex={-1}
              className="relative z-[130] w-full max-w-[640px] max-h-[85vh] overflow-hidden rounded-2xl border bg-white shadow-none"
              style={{ borderColor: 'var(--border)' }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.stopPropagation()
                  setShowTestModal(false)
                  handleReset()
                  triggerRef.current?.focus()
                }
              }}
            >
              <div className="sticky top-0 flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
                  Opcje
                </p>
                <button
                  onClick={() => {
                    setShowTestModal(false)
                    handleReset()
                    triggerRef.current?.focus()
                  }}
                  className="h-9 w-9 rounded-full hover:bg-[var(--hover-bg)]"
                  aria-label="Zamknij"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[75vh] overflow-y-auto px-5 py-4 space-y-4">
                <Section
                  title="Pytania"
                  items={[
                    {
                      label: 'Liczba pytań',
                      control: (
                        <NumberInput
                          value={clampedCount}
                          min={5}
                          max={Math.min(20, cardCount)}
                          onChange={setTestCount}
                          note={`Dostępne: ${cardCount}`}
                        />
                      ),
                    },
                  ]}
                />

                <Section
                  title="Zawartość"
                  items={[
                    {
                      label: 'Ucz się wyłącznie pojęć oznaczonych gwiazdką',
                      control: <Toggle checked={starredOnly} onChange={setStarredOnly} />,
                    },
                  ]}
                  warning={starredOnly && cardCount === 0 ? 'Brak oznaczonych pojęć' : undefined}
                />

                <Section
                  title="Tryby testu"
                  hint={minTypeHint ? 'Minimum jeden tryb musi być włączony. Włączono ABCD.' : undefined}
                  items={[
                    {
                      label: 'ABCD',
                      control: <Toggle checked={enabledModes.includes('abcd')} onChange={(v) => toggleMode('abcd', v)} />,
                    },
                    {
                      label: 'Tłumaczenie',
                      control: <Toggle checked={enabledModes.includes('translate')} onChange={(v) => toggleMode('translate', v)} />,
                    },
                  ]}
                />

                <Section
                  title="Ustawienia kolejności"
                  items={[
                    {
                      label: 'Losowa kolejność pytań',
                      control: <Toggle checked={randomizeQuestions} onChange={setRandomizeQuestions} />,
                    },
                    {
                      label: 'Losowa kolejność odpowiedzi (ABCD)',
                      control: <Toggle checked={randomizeAnswers} onChange={setRandomizeAnswers} disabled={!enabledModes.includes('abcd')} />,
                      muted: !enabledModes.includes('abcd'),
                    },
                  ]}
                />

                <Section
                  title="Opcje korekty"
                  items={[
                    {
                      label: 'Wymagaj tylko 1 odpowiedzi',
                      control: <Toggle checked={requireSingle} onChange={setRequireSingle} />,
                    },
                    {
                      label: 'Pomijanie literówek',
                      control: <Toggle checked={allowTypos} onChange={setAllowTypos} disabled={!enabledModes.includes('translate')} />,
                      muted: !enabledModes.includes('translate'),
                    },
                  ]}
                />
              </div>

              <div className="flex items-center justify-between border-t px-5 py-4" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pamiętamy Twoje ustawienia
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTestModal(false)
                      handleReset()
                    }}
                    className="h-10 rounded-full px-4 text-sm font-semibold"
                    style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    Anuluj
                  </button>
                  <button
                    type="button"
                    disabled={loading || savingPrefs || !enabledModes.length || (starredOnly && cardCount === 0)}
                    className="h-10 rounded-full px-5 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: '#4255FF' }}
                    onClick={handleCreateTest}
                  >
                    {loading ? 'Ładowanie…' : savingPrefs ? 'Zapisywanie…' : 'Rozpocznij test'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

function Section({
  title,
  items,
  warning,
  hint,
}: {
  title: string
  items: Array<{ label: string; control: React.ReactNode; muted?: boolean }>
  warning?: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </p>
        {hint && (
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        )}
      </div>
      <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm" style={{ color: item.muted ? 'var(--text-muted)' : 'var(--text)' }}>
              {item.label}
            </span>
            {item.control}
          </div>
        ))}
      </div>
      {warning && (
        <div className="px-4 py-2 text-[12px]" style={{ color: '#b45309', background: '#fffbeb', borderTop: '1px solid var(--border)' }}>
          {warning}
        </div>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative h-8 w-14 rounded-full transition-colors ${disabled ? 'opacity-50' : ''}`}
      style={{ background: checked ? 'var(--primary)' : 'var(--border)' }}
      aria-pressed={checked}
    >
      <span
        className="absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(24px)' : 'translateX(0px)' }}
      />
    </button>
  )
}

function NumberInput({ value, min, max, onChange, note }: { value: number; min: number; max: number; onChange: (v: number) => void; note?: string }) {
  return (
    <div className="text-right">
      <div className="inline-flex items-center gap-2 rounded-lg border px-2 py-1" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <button
          type="button"
          className="h-7 w-7 rounded-md text-sm font-semibold"
          style={{ color: 'var(--text)' }}
          onClick={() => onChange(Math.max(min, value - 1))}
        >
          –
        </button>
        <input
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
          type="number"
          className="w-16 border-0 bg-transparent text-center text-sm focus:outline-none"
          style={{ color: 'var(--text)' }}
        />
        <button
          type="button"
          className="h-7 w-7 rounded-md text-sm font-semibold"
          style={{ color: 'var(--text)' }}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          +
        </button>
      </div>
      {note && (
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          {note}
        </p>
      )}
    </div>
  )
}
