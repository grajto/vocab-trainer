'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { checkAnswer } from '@/src/lib/answerCheck'
import { useSound } from '@/src/lib/SoundProvider'

// Translate mode: instant feedback with short delays for a "Quizlet-like" feel
const FEEDBACK_DELAY_CORRECT = 200      // just enough to flash green check
const FEEDBACK_DELAY_WRONG = 1500       // show correct answer long enough to read
const FEEDBACK_DELAY_DONE = 1200

// Non-translate modes still use server round-trip timings
const FEEDBACK_DELAY_CORRECT_SLOW = 800
const FEEDBACK_DELAY_WRONG_SLOW = 2000

interface Task {
  cardId: string
  taskType: string
  prompt: string
  answer: string
  expectedAnswer?: string
  options?: string[]
}

/**
 * Fire-and-forget POST to /api/session/answer.
 * Does NOT block the caller; logs errors to console.
 */
function saveAnswerInBackground(data: {
  sessionId: string
  cardId: string
  taskType: string
  userAnswer: string
  isCorrect: boolean
  expectedAnswer?: string
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)

  // Track accuracy locally so we don't need to wait for server
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${sessionId}`)
    if (stored) {
      setTasks(JSON.parse(stored))
    }
  }, [sessionId])

  // Focus input whenever we move to a new task and feedback is cleared
  useEffect(() => {
    if (!feedback && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentIndex, feedback])

  const currentTask = tasks[currentIndex]

  /**
   * Advance to the next task or finish the session.
   */
  const advanceToNext = useCallback((delay: number) => {
    const isLast = currentIndex + 1 >= tasks.length
    if (isLast) {
      setTimeout(() => setSessionDone(true), FEEDBACK_DELAY_DONE)
    } else {
      setTimeout(() => {
        setFeedback(null)
        setUserAnswer('')
        setCurrentIndex(prev => prev + 1)
      }, delay)
    }
  }, [currentIndex, tasks.length])

  /**
   * INSTANT translate check — no server round-trip.
   */
  function handleTranslateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return

    const expected = currentTask.expectedAnswer || currentTask.answer
    const correct = checkAnswer(userAnswer, expected)

    // Update local accuracy
    setAnsweredCount(prev => prev + 1)
    if (correct) setCorrectCount(prev => prev + 1)

    // Show feedback immediately
    if (correct) {
      setFeedback({ correct: true, message: 'Correct' })
      playCorrect()
    } else {
      setFeedback({ correct: false, message: `Correct answer: ${expected}` })
      playWrong()
    }

    // Fire-and-forget save to backend
    saveAnswerInBackground({
      sessionId,
      cardId: currentTask.cardId,
      taskType: 'translate',
      userAnswer,
      isCorrect: correct,
      expectedAnswer: expected,
    })

    // Auto-advance
    advanceToNext(correct ? FEEDBACK_DELAY_CORRECT : FEEDBACK_DELAY_WRONG)
  }

  /**
   * ABCD mode — still uses server round-trip for consistency.
   */
  const submitAnswerToServer = useCallback(async (answer: string, correct: boolean) => {
    if (!currentTask) return
    setLoading(true)

    // Update local accuracy
    setAnsweredCount(prev => prev + 1)
    if (correct) setCorrectCount(prev => prev + 1)

    try {
      await fetch('/api/session/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          cardId: currentTask.cardId,
          taskType: currentTask.taskType,
          userAnswer: answer,
          isCorrect: correct,
        }),
      })

      if (correct) {
        setFeedback({ correct: true, message: 'Correct' })
        playCorrect()
      } else {
        setFeedback({ correct: false, message: `Correct answer: ${currentTask.answer}` })
        playWrong()
      }

      advanceToNext(correct ? FEEDBACK_DELAY_CORRECT_SLOW : FEEDBACK_DELAY_WRONG_SLOW)
    } catch (err) {
      console.error('Answer submit error:', err)
    } finally {
      setLoading(false)
    }
  }, [currentTask, sessionId, advanceToNext, playCorrect, playWrong])

  function handleAbcdSelect(option: string) {
    const correct = option === currentTask.answer
    submitAnswerToServer(option, correct)
  }

  async function handleSentenceSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/check-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requiredPhrase: currentTask.answer,
          sentence: userAnswer,
        }),
      })
      const data = await res.json()
      await submitAnswerToServer(userAnswer, data.ok)
    } catch {
      await submitAnswerToServer(userAnswer, false)
    }
  }

  // No tasks loaded
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-3">No session data found.</p>
          <button onClick={() => router.push('/learn')} className="text-sm text-indigo-600 underline underline-offset-2">
            Go to Learn
          </button>
        </div>
      </div>
    )
  }

  // Session complete
  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center max-w-xs mx-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Session Complete</p>
          <p className="text-5xl font-bold tabular-nums mb-1 text-indigo-600">{accuracy}%</p>
          <p className="text-sm text-slate-400 mb-8">accuracy</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/learn')} className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all">
              New Session
            </button>
            <button onClick={() => router.push('/')} className="block w-full border border-slate-200 py-2.5 rounded-xl text-sm hover:border-indigo-300 transition-colors">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active session
  const progress = ((currentIndex + 1) / tasks.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Progress bar */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
            {currentIndex + 1} / {tasks.length}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 tabular-nums">{accuracy}%</span>
          <button
            onClick={toggleSound}
            className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-4">{currentTask.taskType}</p>
          <h2 className="text-3xl font-semibold tracking-tight mb-10 text-slate-900">{currentTask.prompt}</h2>

          {feedback ? (
            <div className={`inline-block px-5 py-3 rounded-xl text-sm font-medium ${
              feedback.correct
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {feedback.correct ? '✓ Correct' : `✗ ${feedback.message}`}
            </div>
          ) : (
            <>
              {currentTask.taskType === 'translate' && (
                <form onSubmit={handleTranslateSubmit} className="space-y-4">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    autoFocus
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-lg focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!userAnswer.trim()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 transition-all"
                  >
                    Check
                  </button>
                </form>
              )}

              {currentTask.taskType === 'abcd' && currentTask.options && (
                <div className="space-y-2">
                  {currentTask.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAbcdSelect(opt)}
                      disabled={loading}
                      className="w-full text-left px-5 py-3.5 border border-slate-200 rounded-xl text-sm hover:border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <form onSubmit={handleSentenceSubmit} className="space-y-4">
                  <p className="text-sm text-slate-400">
                    Write a sentence using: <strong className="text-indigo-600">{currentTask.answer}</strong>
                  </p>
                  <textarea
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Write a sentence…"
                    autoFocus
                    rows={3}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none resize-none transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !userAnswer.trim()}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 transition-all"
                  >
                    Check
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
