'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { checkAnswerWithTypo, generateHint, normalizeAnswer } from '@/src/lib/answerCheck'
import { useSound } from '@/src/lib/SoundProvider'
import { MoreVertical, X, Settings } from 'lucide-react'
import { StarToggle } from '@/app/_components/StarToggle'
import { SegmentedProgressBar } from '@/app/(app)/_components/ui/SegmentedProgressBar'

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
  direction?: 'pl-en' | 'en-pl'
  /** Sentence mode: PL meaning shown as big prompt */
  promptPl?: string
  /** Sentence mode: EN word that must appear in the sentence */
  requiredEn?: string
  starred?: boolean
}

interface TaskState {
  attempts: number
  usedHint: boolean
  wasWrongBefore: boolean
  translatedDone?: boolean
  describeTranslated?: boolean
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
  const [tasksLoaded, setTasksLoaded] = useState(false)
  const [sessionMode, setSessionMode] = useState<string>('translate')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [sentenceNeedsAcknowledge, setSentenceNeedsAcknowledge] = useState(false)
  const [translateNeedsAdvance, setTranslateNeedsAdvance] = useState(false)
  const [sentenceStage, setSentenceStage] = useState<'translate' | 'sentence'>('translate')
  const [describeStage, setDescribeStage] = useState<'translate' | 'describe'>('translate')
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [returnDeckId, setReturnDeckId] = useState('')
  const [aiInfo, setAiInfo] = useState<{ used: boolean; latencyMs: number } | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testScore, setTestScore] = useState<{ correct: number; total: number } | null>(null)

  // Typo state
  const [typoState, setTypoState] = useState<{ expected: string; userAnswer: string } | null>(null)

  // Hint state
  const [showHint, setShowHint] = useState(false)

  // Toast for success messages
  const [toast, setToast] = useState<{ message: string; show: boolean } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Shuffle toggle (persisted in localStorage) - initialize from localStorage to prevent hydration mismatch
  const [shuffleEnabled, setShuffleEnabled] = useState(() => {
    if (typeof window === 'undefined') return false
    const saved = localStorage.getItem('vocab-shuffle')
    return saved === 'true'
  })
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

  useEffect(() => {
    let ignore = false

    async function loadSession() {
      try {
        if (typeof window !== 'undefined') {
          const stored = sessionStorage.getItem(`session-${sessionId}`)
          if (stored) {
            const parsedStored = JSON.parse(stored)
            let parsed: Task[] = Array.isArray(parsedStored) ? parsedStored : parsedStored.tasks
            if (!Array.isArray(parsed)) parsed = []
            if (!Array.isArray(parsedStored)) {
              setSessionMode(parsedStored.mode || 'translate')
              setReturnDeckId(String(parsedStored.returnDeckId || ''))
            }
            const shufflePref = localStorage.getItem('vocab-shuffle') === 'true'
            if (shufflePref) {
              // Fisher-Yates shuffle for uniform randomization
              const arr = [...parsed]
              for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1))
                ;[arr[i], arr[j]] = [arr[j], arr[i]]
              }
              parsed = arr
            }
            if (!ignore) setTasks(parsed)
            return
          }
        }
      } catch (error) {
        console.error('Failed to load session tasks from storage:', error)
      }

      try {
        const res = await fetch(`/api/session/${sessionId}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Failed to load session')

        const fallbackTasks = Array.isArray(data.tasks) ? data.tasks : []
        const payload = {
          tasks: fallbackTasks,
          mode: String(data.mode || 'translate'),
          returnDeckId: String(data.returnDeckId || ''),
        }
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(`session-${sessionId}`, JSON.stringify(payload))
        }

        if (!ignore) {
          setSessionMode(payload.mode)
          setReturnDeckId(payload.returnDeckId)
          setTasks(fallbackTasks)
        }
      } catch (error) {
        console.error('Failed to load session fallback data:', error)
        if (!ignore) setTasks([])
      }
    }

    loadSession().finally(() => {
      if (!ignore) setTasksLoaded(true)
    })

    return () => { ignore = true }
  }, [sessionId])

  useEffect(() => {
    if (!feedback && !typoState && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, feedback, typoState])

  const currentTask = tasks[currentIndex]

  useEffect(() => {
    const task = tasks[currentIndex]
    if (task?.taskType === 'sentence') {
      const state = getTaskState(task.cardId)
      setSentenceStage(state.translatedDone ? 'sentence' : 'translate')
    } else {
      setSentenceStage('translate')
    }
    if (task?.taskType === 'describe') {
      const state = getTaskState(task.cardId)
      setDescribeStage(state.describeTranslated ? 'describe' : 'translate')
    } else {
      setDescribeStage('translate')
    }
    setTranslateNeedsAdvance(false)
    setQuestionStartedAt(Date.now())
  }, [currentIndex, tasks])


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
      taskStatesRef.current.set(cardId, { attempts: 0, usedHint: false, wasWrongBefore: false, translatedDone: false, describeTranslated: false })
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
        setTranslateNeedsAdvance(false)
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

  const resetFeedbackState = useCallback(() => {
    setFeedback(null)
    setUserAnswer('')
    setShowHint(false)
    setTypoState(null)
    setAiInfo(null)
    setSelectedOption(null)
  }, [])

  function acknowledgeSentenceFeedback() {
    resetFeedbackState()
    setSentenceNeedsAcknowledge(false)
    advanceToNext(50)
  }

  const acknowledgeTranslateFeedback = useCallback(() => {
    resetFeedbackState()
    setTranslateNeedsAdvance(false)
    advanceToNext(50)
  }, [advanceToNext, resetFeedbackState])

  const renderAdvanceButton = (onClick: () => void) => (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center px-5 py-2.5 rounded-[var(--radiusSm)] text-sm font-semibold text-white transition-colors"
        style={{ background: 'var(--primary)' }}
      >
        Dalej (Enter)
      </button>
    </div>
  )

  useEffect(() => {
    if (!sentenceNeedsAcknowledge || typeof window === 'undefined') return

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
    if (!translateNeedsAdvance || typeof window === 'undefined') return

    // Auto-advance after 2 seconds
    const timer = setTimeout(() => {
      acknowledgeTranslateFeedback()
    }, 2000)

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Enter') {
        event.preventDefault()
        clearTimeout(timer)
        acknowledgeTranslateFeedback()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [translateNeedsAdvance, acknowledgeTranslateFeedback])


  useEffect(() => {
    if (!currentTask || currentTask.taskType !== 'abcd' || feedback || typoState || typeof window === 'undefined') return

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

  // Redirect after session is done (must be before all conditional returns to avoid React error #310)
  useEffect(() => {
    if (!sessionDone) return
    const target = returnDeckId ? `/decks/${returnDeckId}` : '/decks'
    const timer = setTimeout(() => router.replace(target), 200)
    return () => clearTimeout(timer)
  }, [sessionDone, returnDeckId, router])

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
        state.wasWrongBefore = true
        setStreak(0)
        setFeedback({ correct: false, message: `Najpierw poprawnie przetłumacz słowo. Poprawna odpowiedź: ${expected}` })
        setTranslateNeedsAdvance(true)
        playWrong()
        requeueCard(currentTask)
        return
      }
      setAnsweredCount(prev => prev + 1)
      setCorrectCount(prev => prev + 1)
      setStreak(prev => prev + 1)
      state.translatedDone = true
      setSentenceStage('sentence')
      setUserAnswer('')
      setFeedback(null)
      setShowHint(false)
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
          phrase: getRequiredWord(),
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
        showToast('Zdanie poprawne')
        playCorrect()
      } else {
        state.wasWrongBefore = true
        setStreak(0)
        const message = buildSentenceFeedbackMessage(data as Record<string, unknown>, getRequiredWord())
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
      // If wrong: sentenceNeedsAcknowledge is set, user must press Enter/Continue to advance
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
    if (!currentTask) return

    if (feedback && sentenceNeedsAcknowledge) {
      acknowledgeSentenceFeedback()
      return
    }

    if (!userAnswer.trim()) return

    const state = getTaskState(currentTask.cardId)
    state.attempts++

    if (describeStage === 'translate') {
      const expected = currentTask.expectedAnswer || currentTask.answer
      const result = checkAnswerWithTypo(userAnswer, expected)
      const correct = result === 'correct' || result === 'typo'
      if (!correct) {
        state.wasWrongBefore = true
        setStreak(0)
        setFeedback({ correct: false, message: `Najpierw poprawnie przetłumacz słowo. Poprawna odpowiedź: ${expected}` })
        setTranslateNeedsAdvance(true)
        playWrong()
        requeueCard(currentTask)
        return
      }
      state.describeTranslated = true
      setAnsweredCount(prev => prev + 1)
      setCorrectCount(prev => prev + 1)
      setStreak(prev => prev + 1)
      setDescribeStage('describe')
      setUserAnswer('')
      setShowHint(false)
      setFeedback(null)
      playCorrect()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/check-describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          word: currentTask.requiredEn || currentTask.answer,
          description: userAnswer,
          meaningPl: currentTask.prompt,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const message = data?.message_pl || data?.error || 'AI validation failed. Try again.'
        setFeedback({ correct: false, message })
        setSentenceNeedsAcknowledge(true)
        playWrong()
        requeueCard(currentTask)
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
        showToast('Opis poprawny')
        playCorrect()
      } else {
        state.wasWrongBefore = true
        setStreak(0)
        const msg = data.suggested_fix
          ? `${data.message_pl || 'Incorrect'}\nSuggested: ${data.suggested_fix}`
          : (data.message_pl || 'Spróbuj opisać inaczej')
        setFeedback({ correct: false, message: msg })
        setSentenceNeedsAcknowledge(true)
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

      if (correct) {
        advanceToNext(FEEDBACK_DELAY_CORRECT_SLOW)
      }
      // If wrong: sentenceNeedsAcknowledge is set, user must press Enter/Continue to advance
    } catch {
      state.wasWrongBefore = true
      setFeedback({ correct: false, message: 'Network error – try again' })
      setSentenceNeedsAcknowledge(true)
      playWrong()
      requeueCard(currentTask)
    } finally {
      setLoading(false)
    }
  }

  function toggleShuffle() {
    setShuffleEnabled(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('vocab-shuffle', String(next))
      }
      return next
    })
  }

  function showToast(message: string) {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current)
    }
    setToast({ message, show: true })
    toastTimeoutRef.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  function getModeLabel(): string {
    // Sentence mode should always show 'Translate' since it's translate-based
    if (sessionMode === 'sentence') return 'Translate'
    if (sessionMode === 'describe') return 'Describe'
    if (currentTask?.taskType === 'abcd') return 'ABCD'
    return 'Translate'
  }

  function getRequiredWord(): string {
    return currentTask?.requiredEn || currentTask?.prompt || ''
  }

  function getDirectionLabel(): string {
    // Check if task has explicit direction
    if (currentTask?.direction === 'en-pl') return 'EN → PL'
    if (currentTask?.direction === 'pl-en') return 'PL → EN'
    
    // Fallback: try to infer from prompt vs answer
    // If prompt looks like English (mostly ASCII) and answer looks like Polish (has special chars), it's EN→PL
    const hasPolishChars = (text: string) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(text)
    
    if (currentTask) {
      const promptHasPolish = hasPolishChars(currentTask.prompt)
      const answerHasPolish = hasPolishChars(currentTask.answer)
      
      if (promptHasPolish && !answerHasPolish) return 'PL → EN'
      if (!promptHasPolish && answerHasPolish) return 'EN → PL'
    }
    
    // Default fallback
    return 'PL → EN'
  }

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>No session data found.</p>
          <button onClick={() => router.push('/study')} className="text-sm underline underline-offset-2" style={{ color: 'var(--primary)' }}>
            Przejdź do Ucz się
          </button>
        </div>
      </div>
    )
  }

  if (sessionMode === 'test') {
    const isFreeForm = (taskType: string) => taskType === 'describe' || taskType === 'sentence'
    const incorrect = tasks.filter(task => {
      const answer = testAnswers[task.cardId] || ''
      if (task.taskType === 'abcd') return normalizeAnswer(answer) !== normalizeAnswer(task.answer)
      if (isFreeForm(task.taskType)) return !answer.trim()
      return normalizeAnswer(answer) !== normalizeAnswer(task.expectedAnswer || task.answer)
    })

    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: 'var(--text-muted)' }}>Test</div>
            <button
              onClick={handleStopSession}
              className="text-xs font-medium hover:opacity-70 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              Przerwij sesję
            </button>
          </div>
        </div>
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--text)' }}>Test</h2>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{tasks.length} pytań</span>
          </div>
          {testSubmitted && testScore ? (
            <div className="rounded-[var(--radius)] p-8 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Wynik: {Math.round((testScore.correct / testScore.total) * 100)}%</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Błędy: {testScore.total - testScore.correct}</p>
              {incorrect.length > 0 && (
                <div className="space-y-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  {incorrect.map(task => (
                    <div key={task.cardId} className="text-sm" style={{ color: 'var(--text-muted)' }}>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>Pytanie {idx + 1}</p>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{idx + 1} / {tasks.length}</span>
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
                     if (isFreeForm(task.taskType)) return Boolean(answer.trim())
                     return normalizeAnswer(answer) === normalizeAnswer(task.expectedAnswer || task.answer)
                   })
                  setTestScore({ correct: correct.length, total: tasks.length })
                  setTestSubmitted(true)
                  tasks.forEach(task => {
                    const answer = testAnswers[task.cardId] || ''
                     const isCorrect = task.taskType === 'abcd'
                       ? normalizeAnswer(answer) === normalizeAnswer(task.answer)
                       : isFreeForm(task.taskType)
                         ? Boolean(answer.trim())
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
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Session Complete</p>
          <p className="text-5xl font-bold tabular-nums mb-1" style={{ color: 'var(--primary)' }}>{accuracy}%</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Przekierowanie do zestawu…</p>
        </div>
      </div>
    )
  }


  if (!tasksLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ładowanie sesji…</p>
      </div>
    )
  }

  if (!currentTask) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="text-center max-w-sm px-4">
          <p className="text-sm font-semibold mb-2">Nie udało się załadować pytań sesji.</p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Spróbuj uruchomić sesję ponownie z listy zestawów.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/decks')}
            className="rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--primary)' }}
          >
            Wróć do zestawów
          </button>
        </div>
      </div>
    )
  }

  const hintText = showHint && currentTask ? generateHint(currentTask.expectedAnswer || currentTask.answer) : ''

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Toast notification */}
      {toast?.show && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg transition-opacity"
          style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}
          role="alert"
          aria-live="polite"
        >
          <span className="font-semibold">✓ {toast.message}</span>
        </div>
      )}

      <div className="fixed right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
        {currentTask && (
          <StarToggle 
            cardId={currentTask.cardId} 
            initialStarred={Boolean(currentTask.starred)} 
            className="p-2 transition-colors hover:bg-[var(--hover-bg)] rounded-full"
          />
        )}
        <button
          onClick={handleStopSession}
          className="p-2 transition-colors hover:bg-[var(--hover-bg)] rounded-full"
          style={{ color: 'var(--text-muted)' }}
          title="Return to dashboard"
          aria-label="Exit session"
        >
          <X size={18} />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="p-2 transition-colors hover:bg-[var(--hover-bg)] rounded-full"
            style={{ color: 'var(--text-muted)' }}
          title="Settings"
            aria-label="Settings"
          >
            <Settings size={18} />
          </button>
          {menuOpen ? (
            <div className="absolute right-12 top-1/2 z-20 w-52 -translate-y-1/2 rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <button onClick={toggleSound} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]">Sound: {soundEnabled ? 'on' : 'off'}</button>
              <button onClick={toggleShuffle} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]">Shuffle: {shuffleEnabled ? 'on' : 'off'}</button>
              <button onClick={handleStopSession} className="block w-full rounded px-2 py-1 text-left hover:bg-[var(--hover-bg)]" style={{ color: 'var(--danger)' }}>End session</button>
            </div>
          ) : null}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <SegmentedProgressBar 
            current={currentIndex + 1} 
            total={tasks.length}
            segments={Math.min(20, tasks.length)}
          />
        </div>
        <div className="rounded-[var(--radius)] px-8 py-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-3" style={{ color: 'var(--text)' }}>
            {currentTask.prompt}
          </h2>
          {currentTask.taskType === 'translate' && (
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Translate this word.</p>
          )}
          {currentTask.taskType === 'sentence' && (
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              {sentenceStage === 'translate' ? 'Translate this word.' : 'Write a sentence with this word.'}
            </p>
          )}
          {currentTask.taskType === 'describe' && (
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>
              {describeStage === 'translate' ? 'Translate this word.' : 'Describe the meaning of this word.'}
            </p>
          )}
          {currentTask.taskType === 'abcd' && (
            <p className="text-sm mb-8" style={{ color: 'var(--text-muted)' }}>Choose the correct answer.</p>
          )}

          {showHint && !feedback && !typoState && (
            <div className="mb-6 text-sm font-mono tracking-widest rounded-full px-5 py-2 inline-block" style={{ color: 'var(--warning)', background: 'var(--warning-soft)', border: '1px solid var(--warning-soft)' }}>
              {hintText}
            </div>
          )}

          {typoState && !feedback && (
            <div className="space-y-4">
              <div className="rounded-[var(--radiusSm)] px-5 py-4 text-sm" style={{ background: 'var(--warning-soft)', border: '1px solid var(--warning-soft)' }}>
                <p className="font-medium mb-2" style={{ color: 'var(--warning)' }}>One typo detected!</p>
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
                  style={{ background: 'var(--success)' }}
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleTypoDecision(false)}
                  className="flex-1 text-white py-2.5 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                  style={{ background: 'var(--danger)' }}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}

          {feedback ? (
            <div className="space-y-4" role="alert" aria-live="polite">
              {feedback.correct ? (
                <>
                  {/* Success badge for translate mode */}
                  {currentTask.taskType === 'translate' && (
                    <div className="flex justify-center">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Translate ✓
                      </span>
                    </div>
                  )}
                  {/* Success badges for sentence mode */}
                  {currentTask.taskType === 'sentence' && sentenceStage === 'sentence' && (
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Translate ✓
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Sentence ✓
                      </span>
                    </div>
                  )}
                  {/* Success badges for describe mode */}
                  {currentTask.taskType === 'describe' && (
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Translate ✓
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Describe ✓
                      </span>
                    </div>
                  )}
                  {currentTask.taskType === 'sentence' && sentenceStage === 'translate' && (
                    <div className={`inline-block px-5 py-3 rounded-[var(--radiusSm)] text-sm font-medium`} style={{
                      background: 'var(--success-soft)',
                      color: 'var(--success)',
                      border: '1px solid var(--success-soft)',
                    }}>
                      ✓ {feedback.message}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Error panel with AI explanation */}
                  <div className={`rounded-[var(--radiusSm)] p-4 text-sm`} style={{
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    border: '1px solid var(--danger-soft)',
                  }}>
                    <div className="font-medium mb-2">✗ Incorrect</div>
                    <div style={{ color: 'var(--danger)' }}>
                      {feedback.message.split('\n').map((line, i) => (
                        <div key={i} className={i > 0 ? 'mt-1' : ''}>{line}</div>
                      ))}
                    </div>
                  </div>
                  {/* Error badges for sentence/describe */}
                  {(currentTask.taskType === 'sentence' || currentTask.taskType === 'describe') && sentenceNeedsAcknowledge && (
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Translate ✓
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger-soft)' }}>
                        {currentTask.taskType === 'sentence' ? 'Sentence' : 'Describe'} ✗
                      </span>
                    </div>
                  )}
                </>
              )}
              {currentTask.taskType === 'sentence' && sentenceNeedsAcknowledge && renderAdvanceButton(acknowledgeSentenceFeedback)}
              {currentTask.taskType === 'describe' && sentenceNeedsAcknowledge && renderAdvanceButton(acknowledgeSentenceFeedback)}
              {translateNeedsAdvance && renderAdvanceButton(acknowledgeTranslateFeedback)}
              {currentTask.taskType === 'sentence' && aiInfo && (
                <div className="flex justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold" style={{
                    background: aiInfo.used ? 'var(--success-soft)' : 'var(--surface2)',
                    color: aiInfo.used ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${aiInfo.used ? 'var(--success-soft)' : 'var(--border)'}`,
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
                  {/* Direction chip removed as per user request */}
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
                        className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid var(--warning-soft)', color: 'var(--warning)', background: 'var(--warning-soft)' }}
                      >
                        Hint
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!userAnswer.trim()}
                      className="flex-1 text-white py-3 rounded-[var(--radiusSm)] text-sm font-medium disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      Sprawdź
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentTask) return
                        const state = getTaskState(currentTask.cardId)
                        state.attempts++
                        state.wasWrongBefore = true
                        setStreak(0)
                        const expected = currentTask.expectedAnswer || currentTask.answer
                        setFeedback({ correct: false, message: `Correct answer: ${expected}` })
                        playWrong()
                        requeueCard(currentTask)
                        saveAnswerInBackground({
                          sessionId,
                          cardId: currentTask.cardId,
                          taskType: 'translate',
                          userAnswer: '',
                          isCorrect: false,
                          expectedAnswer: expected,
                          attemptsCount: state.attempts,
                          wasWrongBeforeCorrect: state.wasWrongBefore,
                          usedHint: state.usedHint,
                        })
                        advanceToNext(FEEDBACK_DELAY_WRONG)
                      }}
                      className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                      style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                    >
                      Skip
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
                              ? 'var(--success-soft)'
                              : opt === selectedOption
                                ? 'var(--danger-soft)'
                                : 'var(--border)'
                            : 'var(--border)'
                        }`,
                        background: feedback
                          ? opt === currentTask.answer
                            ? 'var(--success-soft)'
                            : opt === selectedOption
                              ? 'var(--danger-soft)'
                              : 'var(--surface)'
                          : 'var(--surface)',
                        color: feedback
                          ? opt === currentTask.answer
                            ? 'var(--success)'
                            : opt === selectedOption
                              ? 'var(--danger)'
                              : 'var(--text-muted)'
                          : 'var(--text)',
                      }}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 mr-3 rounded-full text-xs font-semibold" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
                        {idx + 1}
                      </span>
                      {opt}
                    </button>
                  ))}
                  <div className="flex items-center justify-center gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    <span>Tip: press 1–4</span>
                    <button
                      type="button"
                      onClick={handleAbcdSkip}
                      className="transition-colors hover:opacity-80"
                      style={{ color: 'var(--primary)' }}
                    >
                      Pomiń
                    </button>
                  </div>
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <div className="space-y-5">
                  {/* Input field - single line for translate, textarea for sentence */}
                  {sentenceStage === 'translate' ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (userAnswer.trim() && !loading) {
                            handleSentenceSubmit(e as unknown as React.FormEvent)
                          }
                        }
                      }}
                      placeholder="Type translation..."
                      autoFocus
                      className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-center text-lg focus:outline-none transition-colors"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      disabled={loading}
                    />
                  ) : (
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
                      placeholder="Write a sentence using this word..."
                      autoFocus
                      rows={4}
                      className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      disabled={loading}
                    />
                  )}

                  {/* Hint + Check + Skip buttons */}
                  <div className="flex gap-2">
                    {!showHint && sentenceStage === 'translate' && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid var(--warning-soft)', color: 'var(--warning)', background: 'var(--warning-soft)' }}
                      >
                        Hint
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
                      {loading ? 'Checking…' : sentenceNeedsAcknowledge ? 'Dalej' : 'Sprawdź'}
                    </button>
                    {!feedback && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentTask) return
                          const state = getTaskState(currentTask.cardId)
                          state.attempts++
                          state.wasWrongBefore = true
                          setStreak(0)
                          playWrong()
                          
                          // Save as wrong answer
                          saveAnswerInBackground({
                            sessionId,
                            cardId: currentTask.cardId,
                            taskType: 'sentence',
                            userAnswer: '',
                            isCorrect: false,
                            expectedAnswer: currentTask.expectedAnswer || currentTask.answer,
                            attemptsCount: state.attempts,
                            wasWrongBeforeCorrect: state.wasWrongBefore,
                            usedHint: state.usedHint,
                          })
                          
                          // Skip entire word - don't enter sentence stage
                          setUserAnswer('')
                          setShowHint(false)
                          setSentenceStage('translate')
                          advanceToNext(FEEDBACK_DELAY_WRONG)
                        }}
                        className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                      >
                        Skip
                      </button>
                    )}
                  </div>

                  {/* Completion badges */}
                  {sentenceStage === 'sentence' && (
                    <div className="flex justify-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--success-soft)', color: 'var(--success)', border: '1px solid var(--success-soft)' }}>
                        Translate ✓
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{sentenceStage === 'translate' ? 'Stage 1/2: translation' : 'Stage 2/2: write sentence'}</p>
                </div>
              )}

              {currentTask.taskType === 'describe' && (
                <div className="space-y-5">
                  {describeStage === 'translate' ? (
                    <input
                      ref={inputRef as React.RefObject<HTMLInputElement>}
                      type="text"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          if (userAnswer.trim() && !loading) {
                            handleDescribeSubmit(e as unknown as React.FormEvent)
                          }
                        }
                      }}
                      placeholder="Translate this word..."
                      autoFocus
                      className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-center text-lg focus:outline-none transition-colors"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      disabled={loading}
                    />
                  ) : (
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
                      placeholder="Napisz definicję własnymi słowami..."
                      autoFocus
                      rows={4}
                      className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
                      disabled={loading}
                    />
                  )}
                  <div className="flex gap-2">
                    {!showHint && describeStage === 'translate' && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm transition-colors"
                        style={{ border: '1px solid var(--warning-soft)', color: 'var(--warning)', background: 'var(--warning-soft)' }}
                      >
                        Hint
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        if ((!feedback && userAnswer.trim() && !loading) || (feedback && sentenceNeedsAcknowledge && !loading)) {
                          handleDescribeSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      disabled={loading || (!sentenceNeedsAcknowledge && !userAnswer.trim())}
                      className="flex-1 text-white py-3 rounded-[var(--radiusSm)] text-sm font-medium disabled:opacity-40 transition-colors"
                      style={{ background: 'var(--primary)' }}
                    >
                      {loading ? 'Checking…' : sentenceNeedsAcknowledge ? 'Dalej' : (describeStage === 'translate' ? 'Sprawdź' : 'Sprawdź opis')}
                    </button>
                    {!feedback && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentTask) return
                          const state = getTaskState(currentTask.cardId)
                          state.attempts++
                          state.wasWrongBefore = true
                          setStreak(0)
                          const expected = currentTask.expectedAnswer || currentTask.answer
                          setFeedback({ correct: false, message: expected ? `Correct answer: ${expected}` : 'Pominięto' })
                          playWrong()
                          requeueCard(currentTask)
                          saveAnswerInBackground({
                            sessionId,
                            cardId: currentTask.cardId,
                            taskType: 'describe',
                            userAnswer: '',
                            isCorrect: false,
                            expectedAnswer: expected,
                            attemptsCount: state.attempts,
                            wasWrongBeforeCorrect: state.wasWrongBefore,
                            usedHint: state.usedHint,
                            aiUsed: false,
                            responseTimeMs: Date.now() - questionStartedAt,
                            streakAfterAnswer: 0,
                          })
                          setUserAnswer('')
                          setShowHint(false)
                          setDescribeStage('translate')
                          advanceToNext(FEEDBACK_DELAY_WRONG_SLOW)
                        }}
                        className="min-w-[96px] px-4 py-3 rounded-[var(--radiusSm)] text-sm font-medium transition-colors"
                        style={{ border: '1px solid var(--border)', color: 'var(--text-muted)', background: 'var(--surface)' }}
                      >
                        Skip
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    {describeStage === 'translate' ? 'Stage 1/2: translation' : 'Stage 2/2: description'}
                  </p>
                  {describeStage === 'describe' && (
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Ctrl+Enter to submit</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
