'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

const FEEDBACK_DELAY_DONE = 1500
const FEEDBACK_DELAY_CORRECT = 1000
const FEEDBACK_DELAY_WRONG = 2500

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
        setFeedback({ correct: true, message: '✓ Correct!' })
      } else {
        setFeedback({ correct: false, message: `✗ Correct answer: ${currentTask.answer}` })
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

  if (tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No session data found.</p>
          <button onClick={() => router.push('/learn')} className="text-blue-600 underline">Go to Learn</button>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow max-w-sm">
          <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
          <p className="text-4xl font-bold text-blue-600 mb-4">{accuracy}%</p>
          <p className="text-gray-500 mb-6">accuracy</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/learn')} className="block w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              New Session
            </button>
            <button onClick={() => router.push('/')} className="block w-full bg-gray-200 py-2 rounded hover:bg-gray-300">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium">{currentIndex + 1} / {tasks.length}</span>
        <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${((currentIndex + 1) / tasks.length) * 100}%` }} />
        </div>
        <span className="text-sm text-gray-500">{accuracy}%</span>
      </div>

      <main className="max-w-lg mx-auto p-4 mt-8">
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-xs text-gray-400 uppercase mb-2">{currentTask.taskType}</p>
          <h2 className="text-3xl font-bold mb-8">{currentTask.prompt}</h2>

          {feedback ? (
            <div className={`p-4 rounded-lg ${feedback.correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {feedback.message}
            </div>
          ) : (
            <>
              {currentTask.taskType === 'translate' && (
                <form onSubmit={handleTranslateSubmit} className="space-y-4">
                  <input
                    type="text"
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    autoFocus
                    className="w-full border-2 rounded-lg px-4 py-3 text-center text-lg focus:border-blue-500 outline-none"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !userAnswer.trim()} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
                    Check
                  </button>
                </form>
              )}

              {currentTask.taskType === 'abcd' && currentTask.options && (
                <div className="grid grid-cols-1 gap-3">
                  {currentTask.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAbcdSelect(opt)}
                      disabled={loading}
                      className="p-4 border-2 rounded-lg text-left hover:bg-blue-50 hover:border-blue-300 transition disabled:opacity-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <form onSubmit={handleSentenceSubmit} className="space-y-4">
                  <p className="text-sm text-gray-500">Write a sentence using: <strong>{currentTask.answer}</strong></p>
                  <textarea
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Write a sentence..."
                    autoFocus
                    rows={3}
                    className="w-full border-2 rounded-lg px-4 py-3 text-lg focus:border-blue-500 outline-none resize-none"
                    disabled={loading}
                  />
                  <button type="submit" disabled={loading || !userAnswer.trim()} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
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
