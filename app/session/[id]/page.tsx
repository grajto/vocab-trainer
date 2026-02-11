'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { checkAnswerWithTypo, generateHint, normalizeAnswer } from '@/src/lib/answerCheck'
import { useSound } from '@/src/lib/SoundProvider'
import { MoreVertical } from 'lucide-react'

const FEEDBACK_DELAY_CORRECT = 200
const FEEDBACK_DELAY_WRONG = 1500
const FEEDBACK_DELAY_DONE = 1200
const FEEDBACK_DELAY_CORRECT_SLOW = 800
const FEEDBACK_DELAY_WRONG_SLOW = 2000

interface Task {
  cardId: string
  taskType: string
  prompt: string
  answer: string
  expectedAnswer?: string
  options?: string[]
  /** Sentence mode: PL meaning shown as big prompt */
  promptPl?: string
  /** Sentence mode: EN word that must appear in the sentence */
  requiredEn?: string
}

interface TaskState {
  attempts: number
  usedHint: boolean
  wasWrongBefore: boolean
}

function saveAnswerInBackground(data: {
  sessionId: string
  cardId: string
  taskType: string
  userAnswer: string
  isCorrect: boolean
  expectedAnswer?: string
  attemptsCount?: number
  wasWrongBeforeCorrect?: boolean
  usedHint?: boolean
  userOverride?: boolean
  aiUsed?: boolean
  responseTimeMs?: number
  streakAfterAnswer?: number
}) {
  fetch('/api/session/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  }).catch(err => {
    console.error(`Background save failed (session=${data.sessionId}, card=${data.cardId}):`, err)
  })
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()
  const { playCorrect, playWrong, enabled: soundEnabled, toggle: toggleSound } = useSound()

  const [tasks, setTasks] = useState<Task[]>([])
  const [sessionMode, setSessionMode] = useState<string>('translate')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [sentenceNeedsAcknowledge, setSentenceNeedsAcknowledge] = useState(false)
  const [sentenceStage, setSentenceStage] = useState<'translate' | 'sentence'>('translate')
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [aiInfo, setAiInfo] = useState<{ used: boolean; latencyMs: number } | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore] = useState<{ correct: number; total: number } | null>(null)

  // Typo state
  const [typoState, setTypoState] = useState<{ expected: string; userAnswer: string } | null>(null)

  // Hint state
  const [showHint, setShowHint] = useState(false)

  // Shuffle toggle (persisted in localStorage)
  const [shuffleEnabled, setShuffleEnabled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Track per-card state (attempts, hints used)
  const taskStatesRef = useRef<Map<string, TaskState>>(new Map())

  // Track accuracy locally
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [questionStartedAt, setQuestionStartedAt] = useState(Date.now())
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // Load shuffle setting
  useEffect(() => {
    const saved = localStorage.getItem('vocab-shuffle')
    if (saved === 'true') setShuffleEnabled(true)
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${sessionId}`)
    if (stored) {
      const parsedStored = JSON.parse(stored)
      let parsed: Task[] = Array.isArray(parsedStored) ? parsedStored : parsedStored.tasks
      if (!Array.isArray(parsed)) parsed = []
      if (!Array.isArray(parsedStored)) {
        setSessionMode(parsedStored.mode || 'translate')
      }
      const shufflePref = localStorage.getItem('vocab-shuffle') === 'true'
      if (shufflePref) {
        // Fisher-Yates shuffle for uniform randomization
        const arr = [...parsed]
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]]
        }
        parsed = arr
      }
      setTasks(parsed)
    }
  }, [sessionId])

  useEffect(() => {
    if (!feedback && !typoState && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, feedback, typoState])

  const currentTask = tasks[currentIndex]

  useEffect(() => {
    setSentenceStage('translate')
    setQuestionStartedAt(Date.now())
  }, [currentIndex])


  async function handleStopSession() {
    try {
      await fetch('/api/session/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      })
    } finally {
      router.push('/')
    }
  }

  function getTaskState(cardId: string): TaskState {
    if (!taskStatesRef.current.has(cardId)) {
      taskStatesRef.current.set(cardId, { attempts: 0, usedHint: false, wasWrongBefore: false })
    }
    return taskStatesRef.current.get(cardId)!
  }

  const advanceToNext = useCallback((delay: number) => {
    const isLast = currentIndex + 1 >= tasks.length
    if (isLast) {
      setTimeout(() => setSessionDone(true), FEEDBACK_DELAY_DONE)
    } else {
      setTimeout(() => {
        setFeedback(null)
        setUserAnswer('')
        setShowHint(false)
        setTypoState(null)
        setAiInfo(null)
        setSelectedOption(null)
        setSentenceNeedsAcknowledge(false)
        setCurrentIndex(prev => prev + 1)
        setQuestionStartedAt(Date.now())
      }, delay)
    }
  }, [currentIndex, tasks.length])

  function requeueCard(task: Task) {
    setTasks(prev => [...prev, { ...task }])
  }

  function handleTranslateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return

    const expected = currentTask.expectedAnswer || currentTask.answer
    const state = getTaskState(currentTask.cardId)
    state.attempts++

    const result = checkAnswerWithTypo(userAnswer, expected)

    if (result === 'typo') {
      setTypoState({ expected, userAnswer: userAnswer.trim() })
      return
    }

    finishTranslateAnswer(result === 'correct', expected, state, false)
  }

  function handleTypoDecision(accept: boolean) {
    if (!typoState || !currentTask) return
    const state = getTaskState(currentTask.cardId)
    finishTranslateAnswer(accept, typoState.expected, state, true)
    setTypoState(null)
  }

  function finishTranslateAnswer(correct: boolean, expected: string, state: TaskState, userOverride: boolean) {
    if (!currentTask) return

    if (correct) {
      state.wasWrongBefore = state.wasWrongBefore || state.attempts > 1
      setAnsweredCount(prev => prev + 1)
      setCorrectCount(prev => prev + 1)
      setStreak(prev => prev + 1)
      setStreak(prev => prev + 1)
      setFeedback({ correct: true, message: 'Correct' })
      playCorrect()
    } else {
      state.wasWrongBefore = true
      setStreak(0)
      setFeedback({ correct: false, message: `Correct answer: ${expected}` })
      playWrong()
      requeueCard(currentTask)
    }

    saveAnswerInBackground({
      sessionId,
      cardId: currentTask.cardId,
      taskType: 'translate',
      userAnswer,
      isCorrect: correct,
      expectedAnswer: expected,
      attemptsCount: state.attempts,
      wasWrongBeforeCorrect: state.wasWrongBefore,
      usedHint: state.usedHint,
      userOverride,
      responseTimeMs: Date.now() - questionStartedAt,
      streakAfterAnswer: correct ? streak + 1 : 0,
    })

    advanceToNext(correct ? FEEDBACK_DELAY_CORRECT : FEEDBACK_DELAY_WRONG)
  }

  function handleHintClick() {
    if (!currentTask) return
    const state = getTaskState(currentTask.cardId)
    state.usedHint = true
    setShowHint(true)
  }

  function handleAbcdSelect(option: string) {
    if (!currentTask || feedback) return
    const correct = option === currentTask.answer
    const state = getTaskState(currentTask.cardId)
    state.attempts++
    setSelectedOption(option)

    if (correct) {
      state.wasWrongBefore = state.wasWrongBefore || state.attempts > 1
      setAnsweredCount(prev => prev + 1)
      setCorrectCount(prev => prev + 1)
      setStreak(prev => prev + 1)
      setFeedback({ correct: true, message: 'Correct' })
      playCorrect()
    } else {
      state.wasWrongBefore = true
      setStreak(0)
      setFeedback({ correct: false, message: `Correct answer: ${currentTask.answer}` })
      playWrong()
      requeueCard(currentTask)
    }

    // Fire-and-forget save
    saveAnswerInBackground({
      sessionId,
      cardId: currentTask.cardId,
      taskType: 'abcd',
      userAnswer: option,
      isCorrect: correct,
      attemptsCount: state.attempts,
      wasWrongBeforeCorrect: state.wasWrongBefore,
      usedHint: state.usedHint,
      responseTimeMs: Date.now() - questionStartedAt,
      streakAfterAnswer: correct ? streak + 1 : 0,
    })

    advanceToNext(correct ? FEEDBACK_DELAY_CORRECT : FEEDBACK_DELAY_WRONG)
  }

  function handleAbcdSkip() {
    if (!currentTask || feedback) return
    const state = getTaskState(currentTask.cardId)
    state.attempts++
    setSelectedOption(null)
    state.wasWrongBefore = true
    setStreak(0)
    setFeedback({ correct: false, message: `Correct answer: ${currentTask.answer}` })
    playWrong()
    requeueCard(currentTask)

    saveAnswerInBackground({
      sessionId,
      cardId: currentTask.cardId,
      taskType: 'abcd',
      userAnswer: '',
      isCorrect: false,
      attemptsCount: state.attempts,
      wasWrongBeforeCorrect: state.wasWrongBefore,
      usedHint: state.usedHint,
    })

    advanceToNext(FEEDBACK_DELAY_WRONG)
  }


  function buildSentenceFeedbackMessage(data: Record<string, unknown>, fallbackWord: string) {
    const comment = typeof data.comment === 'string' ? data.comment.trim() : ''
    const errors = Array.isArray(data.errors) ? data.errors : []

    const details = errors
      .map(err => {
        if (!err || typeof err !== 'object') return ''
        const typed = err as Record<string, unknown>
        const explain = typeof typed.explain === 'string' ? typed.explain : ''
        const from = typeof typed.from === 'string' ? typed.from : ''
        const to = typeof typed.to === 'string' ? typed.to : ''
        if (!explain) return ''
        if (from && to && from !== to) return `• ${explain} (${from} → ${to})`
        return `• ${explain}`
      })
      .filter(Boolean)
      .slice(0, 3)

    const lines: string[] = []
    lines.push(comment || 'This sentence is not correct or does not sound natural.')
    if (details.length > 0) lines.push(...details)
    if (!comment && details.length === 0) lines.push(`• Please use the word "${fallbackWord}" in a clear sentence.`)

    return lines.join('\n')
  }

  function acknowledgeSentenceFeedback() {
    setFeedback(null)
    setSentenceNeedsAcknowledge(false)
    setUserAnswer('')
    setShowHint(false)
    setTypoState(null)
    setAiInfo(null)
    setSelectedOption(null)
    advanceToNext(50)
  }

  useEffect(() => {
    if (!sentenceNeedsAcknowledge) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault()
        setFeedback(null)
        setSentenceNeedsAcknowledge(false)
        setUserAnswer('')
        setShowHint(false)
        setTypoState(null)
        setAiInfo(null)
        setSelectedOption(null)
        setTimeout(() => {
          setCurrentIndex(prev => (prev + 1 < tasks.length ? prev + 1 : prev))
          if (currentIndex + 1 >= tasks.length) {
            setSessionDone(true)
          }
        }, 50)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sentenceNeedsAcknowledge, currentIndex, tasks.length])


  useEffect(() => {
    if (!currentTask || currentTask.taskType !== 'abcd' || feedback || typoState) return

    function handleKey(event: KeyboardEvent) {
      if (!currentTask || currentTask.taskType !== 'abcd' || !currentTask.options) return
      const index = Number(event.key) - 1
      if (Number.isNaN(index) || index < 0 || index > 3) return
      const option = currentTask.options[index]
      if (option) {
        event.preventDefault()
        handleAbcdSelect(option)
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [currentTask, feedback, typoState])

  async function handleSentenceSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!currentTask) return

    if (feedback && sentenceNeedsAcknowledge) {
      acknowledgeSentenceFeedback()
      return
    }

    if (!userAnswer.trim()) return

    const state = getTaskState(currentTask.cardId)
    state.attempts++

    if (sentenceStage === 'translate') {
      const expected = currentTask.expectedAnswer || currentTask.answer
      const result = checkAnswerWithTypo(userAnswer, expected)
      const correct = result === 'correct' || result === 'typo'
      if (!correct) {
        setStreak(0)
        setFeedback({ correct: false, message: `Najpierw poprawnie przetłumacz słowo. Poprawna odpowiedź: ${expected}` })
        playWrong()
        return
      }
      setAnsweredCount(prev => prev + 1)
      setCorrectCount(prev => prev + 1)
      setStreak(prev => prev + 1)
      setFeedback({ correct: true, message: 'Tłumaczenie poprawne. Teraz napisz zdanie z użyciem tego słowa.' })
      setSentenceStage('sentence')
      setUserAnswer('')
      playCorrect()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/check-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phrase: currentTask.requiredEn || currentTask.prompt,
          sentence: userAnswer,
          promptPl: currentTask.promptPl || currentTask.answer,
        }),
      })
      const data = await res.json().catch(() => ({}))
      const correct = !!data.ok
      setAiInfo({ used: !!data.ai_used, latencyMs: Number(data.ai_latency_ms || 0) })

      if (correct) {
        state.wasWrongBefore = state.wasWrongBefore || state.attempts > 1
        setAnsweredCount(prev => prev + 1)
        setCorrectCount(prev => prev + 1)
        setStreak(prev => prev + 1)
        setStreak(prev => prev + 1)
        setFeedback({ correct: true, message: data.comment || data.message_pl || 'Poprawne zdanie.' })
        setSentenceNeedsAcknowledge(false)
        playCorrect()
      } else {
        state.wasWrongBefore = true
        setStreak(0)
        const message = buildSentenceFeedbackMessage(data as Record<string, unknown>, currentTask.requiredEn || currentTask.prompt)
        setFeedback({ correct: false, message })
        setSentenceNeedsAcknowledge(true)
        playWrong()
        requeueCard(currentTask)
      }

      saveAnswerInBackground({
        sessionId,
        cardId: currentTask.cardId,
        taskType: 'sentence',
        userAnswer,
        isCorrect: correct,
        attemptsCount: state.attempts,
        wasWrongBeforeCorrect: state.wasWrongBefore,
        usedHint: state.usedHint,
        aiUsed: data.ai_used ?? false,
        responseTimeMs: Date.now() - questionStartedAt,
        streakAfterAnswer: correct ? streak + 1 : 0,
      })

      if (correct) {
        advanceToNext(FEEDBACK_DELAY_CORRECT_SLOW)
      }
    } catch {
      state.wasWrongBefore = true
      setStreak(0)
      setFeedback({ correct: false, message: 'Network error – try again' })
      setSentenceNeedsAcknowledge(true)
      playWrong()
    } finally {
      setLoading(false)
    }
  }


  async function handleDescribeSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return

    const state = getTaskState(currentTask.cardId)
    state.attempts++

    setLoading(true)
    try {
      const res = await fetch('/api/check-describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          word: currentTask.prompt,
          description: userAnswer,
          meaningPl: currentTask.answer,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data?.message_pl || data?.error || 'AI validation failed. Try again.'
        setFeedback({ correct: false, message })
        playWrong()
        requeueCard(currentTask)
        advanceToNext(FEEDBACK_DELAY_WRONG_SLOW)
        return
      }
      const correct = !!data.ok
      setAiInfo({
        used: !!data.ai_used,
        latencyMs: Number(data.ai_latency_ms || 0),
      })

      if (correct) {
        state.wasWrongBefore = state.wasWrongBefore || state.attempts > 1
        setAnsweredCount(prev => prev + 1)
        setCorrectCount(prev => prev + 1)
        setStreak(prev => prev + 1)
        setFeedback({ correct: true, message: data.message_pl || 'OK' })
        playCorrect()
      } else {
        state.wasWrongBefore = true
        setStreak(0)
        const msg = data.suggested_fix
          ? `${data.message_pl || 'Incorrect'}\nSuggested: ${data.suggested_fix}`
          : (data.message_pl || 'Spróbuj opisać inaczej')
        setFeedback({ correct: false, message: msg })
        playWrong()
        requeueCard(currentTask)
      }

      saveAnswerInBackground({
        sessionId,
        cardId: currentTask.cardId,
        taskType: 'describe',
        userAnswer,
        isCorrect: correct,
        attemptsCount: state.attempts,
        wasWrongBeforeCorrect: state.wasWrongBefore,
        usedHint: state.usedHint,
        aiUsed: data.ai_used ?? false,
        responseTimeMs: Date.now() - questionStartedAt,
        streakAfterAnswer: correct ? streak + 1 : 0,
      })

      advanceToNext(correct ? FEEDBACK_DELAY_CORRECT_SLOW : FEEDBACK_DELAY_WRONG_SLOW)
    } catch {
      state.wasWrongBefore = true
      setFeedback({ correct: false, message: 'Network error – try again' })
      playWrong()
      requeueCard(currentTask)
      advanceToNext(FEEDBACK_DELAY_WRONG_SLOW)
    } finally {
      setLoading(false)
    }
  }

  function toggleShuffle() {
    setShuffleEnabled(prev => {
      const next = !prev
      localStorage.setItem('vocab-shuffle', String(next))
      return next
    })
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--muted)' }}>No session data found.</p>
          <button onClick={() => router.push('/study')} className="text-sm underline underline-offset-2" style={{ color: 'var(--primary)' }}>
            Przejdź do Ucz się
          </button>
        </div>
      </div>
    )
  }

  if (sessionMode === 'test') {
    const incorrect = tasks.filter(task => {
      const answer = testAnswers[task.cardId] || ''
      if (task.taskType === 'abcd') return normalizeAnswer(answer) !== normalizeAnswer(task.answer)
      return normalizeAnswer(answer) !== normalizeAnswer(task.expectedAnswer || task.answer)
    })

    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--muted)' }}>Test</div>
            <button
              onClick={handleStopSession}
              className="text-xs font-medium hover:opacity-70 transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              Przerwij sesję
            </button>
          </div>
        </div>
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Test</h2>
            <span className="text-sm" style={{ color: 'var(--muted)' }}>{tasks.length} pytań</span>
          </div>
          {testSubmitted && testScore ? (
            <div className="rounded-[var(--radius)] p-8 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Wynik: {Math.round((testScore.correct / testScore.total) * 100)}%</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Błędy: {testScore.total - testScore.correct}</p>
              {incorrect.length > 0 && (
                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  {incorrect.map(task => (
                    <div key={task.cardId} className="text-sm" style={{ color: 'var(--muted)' }}>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>{task.prompt}</span> → poprawne: {task.answer}
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => router.push('/')} className="text-sm font-medium hover:opacity-80" style={{ color: 'var(--primary)' }}>
                Wróć do dashboardu
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task, idx) => (
                <div key={task.cardId} className="rounded-[var(--radius)] p-6 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--gray400)' }}>Pytanie {idx + 1}</p>
                    <span className="text-xs" style={{ color: 'var(--gray400)' }}>{idx + 1} / {tasks.length}</span>
                  </div>
                  <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>{task.prompt}</p>
                  {task.taskType === 'abcd' && task.options ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {task.options.map(option => (
                        <label key={option} className="flex items-center gap-2 text-sm rounded-[var(--radiusSm)] px-4 py-3 transition-colors cursor-pointer hover:bg-[var(--hover-bg)]" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
                          <input
                            type="radio"
                            name={`q-${task.cardId}`}
                            value={option}
                            checked={testAnswers[task.cardId] === option}
                            onChange={e => setTestAnswers(prev => ({ ...prev, [task.cardId]: e.target.value }))}
                            className="accent-[var(--primary)]"
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={testAnswers[task.cardId] || ''}
                      onChange={e => setTestAnswers(prev => ({ ...prev, [task.cardId]: e.target.value }))}
                      className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none"
                      style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
                      placeholder="Wpisz odpowiedź"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const correct = tasks.filter(task => {
                    const answer = testAnswers[task.cardId] || ''
                    if (task.taskType === 'abcd') return normalizeAnswer(answer) === normalizeAnswer(task.answer)
                    return normalizeAnswer(answer) === normalizeAnswer(task.expectedAnswer || task.answer)
                  })
                  setTestScore({ correct: correct.length, total: tasks.length })
                  setTestSubmitted(true)
                  tasks.forEach(task => {
                    const answer = testAnswers[task.cardId] || ''
                    const isCorrect = task.taskType === 'abcd'
                      ? normalizeAnswer(answer) === normalizeAnswer(task.answer)
                      : normalizeAnswer(answer) === normalizeAnswer(task.expectedAnswer || task.answer)
                    saveAnswerInBackground({
                      sessionId,
                      cardId: task.cardId,
                      taskType: task.taskType,
                      userAnswer: answer,
                      isCorrect,
                      expectedAnswer: task.expectedAnswer,
                      attemptsCount: 1,
                      wasWrongBeforeCorrect: !isCorrect,
                      usedHint: false,
                    })
                  })
                }}
                className="w-full py-3 rounded-[var(--radiusSm)] font-medium text-white transition-colors"
                style={{ background: 'var(--primary)' }}
              >
                Sprawdź
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center max-w-xs mx-4">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--muted)' }}>Session Complete</p>
          <p className="text-5xl font-bold tabular-nums mb-1" style={{ color: 'var(--primary)' }}>{accuracy}%</p>
          <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>accuracy</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/test')} className="block w-full text-white py-2.5 rounded-[var(--radiusSm)] text-sm font-medium transition-colors" style={{ background: 'var(--primary)' }}>
              Zobacz w Testach
            </button>
            <button onClick={() => router.push('/decks')} className="block w-full py-2.5 rounded-[var(--radiusSm)] text-sm transition-colors" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
              Wróć do zestawu
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / tasks.length) * 100
  const hintText = showHint && currentTask ? generateHint(currentTask.expectedAnswer || currentTask.answer) : ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Progress bar */}
      <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--muted)' }}>
              {currentIndex + 1} / {tasks.length}
            </span>
            <div className="flex-1 h-2.5 rounded-full" style={{ background: 'var(--surface2)' }}>
              <div
                className="h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: streak >= 3 ? '#d4af37' : '#22c55e', height: '10px' }}
              />
            </div>
            <span className="text-xs tabular-nums" style={{ color: 'var(--muted)' }}>{accuracy}%</span>
            <div className="relative">
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              className="text-xs transition-colors"
              style={{ color: 'var(--muted)' }}
              title="Opcje"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-7 z-20 w-52 rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <button onClick={toggleSound} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]">Dźwięk: {soundEnabled ? 'włączony' : 'wyłączony'}</button>
                <button onClick={toggleShuffle} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]">Mieszanie: {shuffleEnabled ? 'włączone' : 'wyłączone'}</button>
                <p className="px-2 py-1" style={{ color: 'var(--muted)' }}>Informacja o mieszaniu i voice ukryta w menu</p>
                <button onClick={handleStopSession} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]" style={{ color: 'var(--danger)' }}>Zakończ sesję/test</button>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="rounded-[var(--radius)] px-8 py-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-6 text-xs" style={{ color: 'var(--gray400)' }}>
            <span className="uppercase tracking-[0.3em]">
              {currentTask.taskType === 'sentence' ? 'sentence' : currentTask.taskType}
            </span>
            <span className="tabular-nums">{currentIndex + 1} / {tasks.length}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
            {currentTask.prompt}
          </h2>
          {currentTask.taskType === 'sentence' && (
            <p className="text-sm mt-3 mb-8" style={{ color: 'var(--muted)' }}>Create a sentence with this word.</p>
          )}
          {currentTask.taskType === 'describe' && (
            <p className="text-sm mt-3 mb-8" style={{ color: 'var(--muted)' }}>Opisz to słowo własnymi słowami.</p>
          )}
          {currentTask.taskType !== 'sentence' && <div className="mb-8" />}

          {showHint && !feedback && !typoState && (
            <div className="mb-6 text-sm font-mono tracking-widest rounded-full px-5 py-2 inline-block" style={{ color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a' }}>
              {hintText}
            </div>
          )}

          {typoState && !feedback && (
            <div className="space-y-4">
              <div className="rounded-[var(--radiusSm)] px-5 py-4 text-sm" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                <p className="font-medium mb-2" style={{ color: '#d97706' }}>One typo detected!</p>
                <p style={{ color: 'var(--text)' }}>
                  Your answer: <span className="font-medium">{typoState.userAnswer}</span>
                </p>
                <p style={{ color: 'var(--text)' }}>
                  Expected: <span className="font-medium">{typoState.expected}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypoDecision(true)}
                  className="flex-1 text-white py-2.5 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                  style={{ background: '#22c55e' }}
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleTypoDecision(false)}
                  className="flex-1 text-white py-2.5 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                  style={{ background: '#ef4444' }}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}

          {feedback ? (
            <div className="space-y-3">
              <div className={`inline-block px-5 py-3 rounded-[var(--radiusSm)] text-sm font-medium`} style={{
                background: feedback.correct ? '#ecfdf5' : '#fef2f2',
                color: feedback.correct ? '#059669' : '#dc2626',
                border: `1px solid ${feedback.correct ? '#a7f3d0' : '#fecaca'}`,
              }}>
                {feedback.correct ? '✓ ' : '✗ '}
                {feedback.message.split('\n').map((line, i) => (
                  <span key={i}>{i > 0 && <br />}{line}</span>
                ))}
              </div>
              {currentTask.taskType === 'sentence' && sentenceNeedsAcknowledge && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={acknowledgeSentenceFeedback}
                    className="inline-flex items-center px-4 py-2 rounded-full text-xs font-semibold transition-colors hover:bg-[var(--primaryBg)]"
                    style={{ border: '1px solid var(--border)', color: 'var(--primary)' }}
                  >
                    I understand — next card (Enter)
                  </button>
                </div>
              )}
              {currentTask.taskType === 'sentence' && aiInfo && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold" style={{
                    background: aiInfo.used ? '#ecfdf5' : 'var(--surface2)',
                    color: aiInfo.used ? '#059669' : 'var(--muted)',
                    border: `1px solid ${aiInfo.used ? '#a7f3d0' : 'var(--border)'}`,
                  }}>
                    AI: {aiInfo.used ? 'ON' : 'OFF'} ({aiInfo.latencyMs} ms)
                  </span>
                </div>
              )}
            </div>
          ) : !typoState && (
            <>
              {currentTask.taskType === 'translate' && (
                <form onSubmit={handleTranslateSubmit} className="space-y-4">
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    autoFocus
                    className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-center text-lg focus:outline-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                  />
                  <div className="flex gap-2">
                    {!showHint && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid #fde68a', color: '#d97706', background: '#fffbeb' }}
                      >
                        💡 Hint
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!userAnswer.trim()}
                      className="flex-1 text-white py-3 rounded-[var(--radiusSm)] text-sm font-medium disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      Check
                    </button>
                  </div>
                </form>
              )}

              {currentTask.taskType === 'abcd' && currentTask.options && (
                <div className="space-y-3">
                  {currentTask.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAbcdSelect(opt)}
                      disabled={!!feedback}
                      className="w-full text-left px-5 py-4 rounded-[var(--radiusSm)] text-sm transition-all"
                      style={{
                        border: `1px solid ${
                          feedback
                            ? opt === currentTask.answer
                              ? '#a7f3d0'
                              : opt === selectedOption
                                ? '#fecaca'
                                : 'var(--border)'
                            : 'var(--border)'
                        }`,
                        background: feedback
                          ? opt === currentTask.answer
                            ? '#ecfdf5'
                            : opt === selectedOption
                              ? '#fef2f2'
                              : 'var(--surface)'
                          : 'var(--surface)',
                        color: feedback
                          ? opt === currentTask.answer
                            ? '#059669'
                            : opt === selectedOption
                              ? '#dc2626'
                              : 'var(--muted)'
                          : 'var(--text)',
                      }}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 mr-3 rounded-full text-xs font-semibold" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                        {idx + 1}
                      </span>
                      {opt}
                    </button>
                  ))}
                  <div className="flex items-center justify-center gap-4 text-[11px]" style={{ color: 'var(--muted)' }}>
                    <span>Tip: press 1–4</span>
                    <button
                      type="button"
                      onClick={handleAbcdSkip}
                      className="transition-colors hover:opacity-80"
                      style={{ color: 'var(--primary)' }}
                    >
                      Nie wiem
                    </button>
                  </div>
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <div className="space-y-5">
                  {/* Required EN word as pill/chip */}
                  <div className="flex justify-center">
                    <span className="inline-block font-semibold px-5 py-2 rounded-full text-base tracking-wide" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
                      {sentenceStage === 'translate' ? currentTask.prompt : (currentTask.promptPl || currentTask.answer)}
                    </span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        if ((!feedback && userAnswer.trim() && !loading) || (feedback && sentenceNeedsAcknowledge && !loading)) {
                          handleSentenceSubmit(e as unknown as React.FormEvent)
                        }
                      }
                    }}
                    placeholder={sentenceStage === 'translate' ? 'Najpierw wpisz tłumaczenie…' : 'Napisz zdanie z użyciem tego słowa…'}
                    autoFocus
                    rows={3}
                    className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                    disabled={loading}
                  />

                  {/* Hint + Check buttons */}
                  <div className="flex gap-2">
                    {!showHint && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid #fde68a', color: '#d97706', background: '#fffbeb' }}
                      >
                        💡 Hint
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        if ((!feedback && userAnswer.trim() && !loading) || (feedback && sentenceNeedsAcknowledge && !loading)) {
                          handleSentenceSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      disabled={loading || (!sentenceNeedsAcknowledge && !userAnswer.trim())}
                      className="flex-1 text-white py-3 rounded-[var(--radiusSm)] text-sm font-medium disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      {loading ? 'Checking…' : sentenceNeedsAcknowledge ? 'Go to next card' : sentenceStage === 'translate' ? 'Sprawdź tłumaczenie' : 'Sprawdź zdanie'}
                    </button>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>{sentenceStage === 'translate' ? 'Etap 1/2: tłumaczenie' : 'Etap 2/2: napisz zdanie'}</p>
                </div>
              )}

              {currentTask.taskType === 'describe' && (
                <div className="space-y-5">
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        if (userAnswer.trim() && !loading) {
                          handleDescribeSubmit(e as unknown as React.FormEvent)
                        }
                      }
                    }}
                    placeholder="Napisz opis..."
                    autoFocus
                    rows={3}
                    className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
                    style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    {!showHint && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid #fde68a', color: '#d97706', background: '#fffbeb' }}
                      >
                        💡 Hint
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        if (userAnswer.trim() && !loading) {
                          handleDescribeSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      disabled={loading || !userAnswer.trim()}
                      className="flex-1 text-white py-3 rounded-[var(--radiusSm)] text-sm font-medium disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      {loading ? 'Checking…' : 'Check'}
                    </button>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>Ctrl+Enter to submit</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
