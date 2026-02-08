'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

const FEEDBACK_DELAY_CORRECT = 800
const FEEDBACK_DELAY_WRONG = 2000
const FEEDBACK_DELAY_DONE = 1200

interface Task {
  cardId: string
  taskType: string
  prompt: string
  answer: string
  options?: string[]
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [accuracy, setAccuracy] = useState(0)

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${sessionId}`)
    if (stored) {
      setTasks(JSON.parse(stored))
    }
  }, [sessionId])

  const currentTask = tasks[currentIndex]

  const submitAnswer = useCallback(async (answer: string, correct: boolean) => {
    if (!currentTask) return
    setLoading(true)

    try {
      const res = await fetch('/api/session/answer', {
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

      const data = await res.json()
      setAccuracy(data.accuracy || 0)

      if (correct) {
        setFeedback({ correct: true, message: 'Correct' })
      } else {
        setFeedback({ correct: false, message: `Correct answer: ${currentTask.answer}` })
      }

      if (data.sessionDone) {
        setTimeout(() => setSessionDone(true), FEEDBACK_DELAY_DONE)
      } else {
        setTimeout(() => {
          setFeedback(null)
          setUserAnswer('')
          setCurrentIndex(prev => prev + 1)
        }, correct ? FEEDBACK_DELAY_CORRECT : FEEDBACK_DELAY_WRONG)
      }
    } catch (err) {
      console.error('Answer submit error:', err)
    } finally {
      setLoading(false)
    }
  }, [currentTask, sessionId])

  function handleTranslateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return
    const correct = userAnswer.trim().toLowerCase() === currentTask.answer.trim().toLowerCase()
    submitAnswer(userAnswer, correct)
  }

  function handleAbcdSelect(option: string) {
    const correct = option === currentTask.answer
    submitAnswer(option, correct)
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
      await submitAnswer(userAnswer, data.ok)
    } catch {
      await submitAnswer(userAnswer, false)
    }
  }

  // No tasks loaded
  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <p className="text-sm text-neutral-400 mb-3">No session data found.</p>
          <button onClick={() => router.push('/learn')} className="text-sm text-neutral-900 underline underline-offset-2">
            Go to Learn
          </button>
        </div>
      </div>
    )
  }

  // Session complete
  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center max-w-xs mx-4">
          <p className="text-xs text-neutral-400 uppercase tracking-widest mb-2">Session Complete</p>
          <p className="text-5xl font-bold tabular-nums mb-1">{accuracy}%</p>
          <p className="text-sm text-neutral-400 mb-8">accuracy</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/learn')} className="block w-full bg-neutral-900 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors">
              New Session
            </button>
            <button onClick={() => router.push('/')} className="block w-full border border-neutral-200 py-2.5 rounded-xl text-sm hover:border-neutral-400 transition-colors">
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
    <div className="min-h-screen bg-neutral-50">
      {/* Progress bar */}
      <div className="border-b border-neutral-200 bg-white px-6 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <span className="text-xs text-neutral-400 tabular-nums whitespace-nowrap">
            {currentIndex + 1} / {tasks.length}
          </span>
          <div className="flex-1 bg-neutral-100 rounded-full h-1.5">
            <div
              className="bg-neutral-900 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-neutral-400 tabular-nums">{accuracy}%</span>
        </div>
      </div>

      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-4">{currentTask.taskType}</p>
          <h2 className="text-3xl font-semibold tracking-tight mb-10">{currentTask.prompt}</h2>

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
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer…"
                    autoFocus
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-center text-lg focus:border-neutral-900 focus:outline-none transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !userAnswer.trim()}
                    className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors"
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
                      className="w-full text-left px-5 py-3.5 border border-neutral-200 rounded-xl text-sm hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <form onSubmit={handleSentenceSubmit} className="space-y-4">
                  <p className="text-sm text-neutral-400">
                    Write a sentence using: <strong className="text-neutral-900">{currentTask.answer}</strong>
                  </p>
                  <textarea
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Write a sentence…"
                    autoFocus
                    rows={3}
                    className="w-full border border-neutral-200 rounded-xl px-4 py-3 text-sm focus:border-neutral-900 focus:outline-none resize-none transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !userAnswer.trim()}
                    className="w-full bg-neutral-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 transition-colors"
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
