'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getSoundManager } from '@/src/lib/soundManager'

const AUTO_NEXT_DELAY = 300
const HINT_MASK_CHAR = '•'

interface Task {
  cardId: string | number
  taskType: string
  prompt: string
  answer: string
  correctIndex?: number
  correctValue?: string
  options?: string[]
}

interface FeedbackState {
  correct: boolean
  message: string
}

function normalizeValue(value: string) {
  return value.trim().toLowerCase()
}

function editDistance(a: string, b: string) {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[a.length][b.length]
}

export default function SessionPage() {
  const params = useParams()
  const sessionId = params.id as string
  const router = useRouter()

  const [tasks, setTasks] = useState<Task[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [incorrectTasks, setIncorrectTasks] = useState<Task[]>([])
  const [pendingTypo, setPendingTypo] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(getSoundManager().isEnabled())

  const inputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${sessionId}`)
    if (stored) {
      setTasks(JSON.parse(stored))
    }
  }, [sessionId])

  const currentTask = tasks[currentIndex]

  useEffect(() => {
    if (feedback || loading) return
    if (!currentTask) return
    if (currentTask.taskType === 'translate') {
      inputRef.current?.focus()
    }
    if (currentTask.taskType === 'sentence') {
      textareaRef.current?.focus()
    }
  }, [currentIndex, feedback, loading, currentTask])

  const accuracy = useMemo(() => {
    if (currentIndex === 0 && correctCount === 0) return 0
    const answered = correctCount + incorrectTasks.length
    return answered > 0 ? Math.round((correctCount / answered) * 100) : 0
  }, [correctCount, incorrectTasks.length, currentIndex])

  const progressSegments = useMemo(() => {
    return tasks.map((task, index) => {
      const status = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'todo'
      return { task, status }
    })
  }, [tasks, currentIndex])

  const sendAnswer = useCallback((answer: string, correct: boolean) => {
    if (!currentTask) return
    void fetch('/api/session/answer', {
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
    }).catch(err => {
      console.error('Answer submit error:', err)
    })
  }, [currentTask, sessionId])

  const moveNext = useCallback(() => {
    setFeedback(null)
    setUserAnswer('')
    setPendingTypo(false)
    setHintShown(false)
    if (currentIndex + 1 >= tasks.length) {
      setSessionDone(true)
    } else {
      setCurrentIndex(prev => prev + 1)
    }
  }, [currentIndex, tasks.length])

  const handleAnswer = useCallback((answer: string, correct: boolean, feedbackMessage: string) => {
    setLoading(true)
    if (correct) {
      setCorrectCount(prev => prev + 1)
    } else {
      setIncorrectTasks(prev => [...prev, currentTask])
    }

    const sound = getSoundManager()
    if (correct) {
      sound.playCorrect()
    } else {
      sound.playWrong()
    }

    setFeedback({ correct, message: feedbackMessage })
    sendAnswer(answer, correct)
    setTimeout(() => {
      setLoading(false)
      moveNext()
    }, AUTO_NEXT_DELAY)
  }, [currentTask, moveNext, sendAnswer])

  function handleTranslateSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userAnswer.trim() || !currentTask) return
    const normalized = normalizeValue(userAnswer)
    const expected = normalizeValue(currentTask.answer)
    if (normalized === expected) {
      handleAnswer(userAnswer, true, 'Dobrze!')
      return
    }
    const distance = editDistance(normalized, expected)
    if (distance === 1) {
      setPendingTypo(true)
      return
    }
    handleAnswer(userAnswer, false, `Poprawna odpowiedź: ${currentTask.answer}`)
  }

  function handleTypoDecision(accept: boolean) {
    if (!currentTask) return
    if (accept) {
      handleAnswer(userAnswer, true, 'Zaliczone (1 literówka)')
    } else {
      handleAnswer(userAnswer, false, `Poprawna odpowiedź: ${currentTask.answer}`)
    }
  }

  function handleAbcdSelect(optionIndex: number) {
    if (!currentTask || currentTask.options == null) return
    const selected = currentTask.options[optionIndex]
    const correctIndex = currentTask.correctIndex ?? currentTask.options.indexOf(currentTask.answer)
    const isCorrect = optionIndex === correctIndex
    handleAnswer(selected, isCorrect, isCorrect ? 'Dobrze!' : `Poprawna odpowiedź: ${currentTask.correctValue ?? currentTask.answer}`)
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
          promptPl: currentTask.prompt,
          requiredWord: currentTask.answer,
          sentence: userAnswer,
        }),
      })
      const data = await res.json()
      handleAnswer(userAnswer, data.ok, data.message_pl || (data.ok ? 'Dobrze!' : 'Spróbuj jeszcze raz'))
    } catch {
      handleAnswer(userAnswer, false, 'Nie udało się zweryfikować zdania.')
    }
  }

  function handleRevealAnswer() {
    if (!currentTask) return
    handleAnswer('', false, `Poprawna odpowiedź: ${currentTask.answer}`)
  }

  function handleHint() {
    setHintShown(true)
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!currentTask || feedback || loading) return
      if (currentTask.taskType === 'abcd') {
        const key = event.key
        if (['1', '2', '3', '4'].includes(key)) {
          event.preventDefault()
          handleAbcdSelect(Number(key) - 1)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentTask, feedback, loading, handleAbcdSelect])

  function toggleSound() {
    const sound = getSoundManager()
    const nextValue = !soundEnabled
    sound.setEnabled(nextValue)
    setSoundEnabled(nextValue)
  }

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

  if (sessionDone) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
            <p className="text-xs text-neutral-400 uppercase tracking-widest mb-2">Sesja zakończona</p>
            <p className="text-5xl font-semibold tabular-nums mb-2">{accuracy}%</p>
            <p className="text-sm text-neutral-400 mb-6">Skuteczność</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => router.push('/learn')} className="px-5 py-2.5 rounded-full bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                Nowa sesja
              </button>
              <button onClick={() => router.push('/')} className="px-5 py-2.5 rounded-full border border-neutral-200 text-sm hover:border-neutral-400 transition-colors">
                Wróć do strony głównej
              </button>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Błędy</h3>
              {incorrectTasks.length > 0 && (
                <button
                  onClick={() => {
                    setTasks(incorrectTasks)
                    setCurrentIndex(0)
                    setIncorrectTasks([])
                    setCorrectCount(0)
                    setSessionDone(false)
                  }}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Powtórz błędy
                </button>
              )}
            </div>
            {incorrectTasks.length === 0 ? (
              <p className="text-sm text-neutral-400">Brak błędów w tej sesji 🎉</p>
            ) : (
              <div className="space-y-3">
                {incorrectTasks.map((task, index) => (
                  <div key={`${task.cardId}-${index}`} className="bg-white border border-neutral-200 rounded-xl px-4 py-3">
                    <p className="text-xs text-neutral-400 mb-1">{task.prompt}</p>
                    <p className="text-sm font-medium">{task.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const progress = tasks.length > 0 ? Math.round(((currentIndex + 1) / tasks.length) * 100) : 0

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-2">
            {progressSegments.map(({ status }, index) => (
              <span
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  status === 'done'
                    ? 'bg-emerald-500'
                    : status === 'current'
                      ? 'bg-blue-500'
                      : 'bg-neutral-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-neutral-400 tabular-nums">{progress}%</span>
          <button
            onClick={toggleSound}
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${soundEnabled ? 'border-blue-200 text-blue-600' : 'border-neutral-200 text-neutral-400'}`}
          >
            Dźwięk {soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white border border-neutral-200 rounded-3xl px-6 py-10 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs text-neutral-400 uppercase tracking-widest">{currentTask.taskType}</p>
              <p className="text-lg font-semibold">{currentIndex + 1} / {tasks.length}</p>
            </div>
            <p className="text-sm text-neutral-500">Skuteczność: <span className="font-semibold tabular-nums">{accuracy}%</span></p>
          </div>

          {feedback ? (
            <div className={`px-5 py-4 rounded-2xl text-sm font-medium ${
              feedback.correct
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              {feedback.message}
            </div>
          ) : (
            <>
              {currentTask.taskType === 'translate' && (
                <form onSubmit={handleTranslateSubmit} className="space-y-6">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-widest mb-2">Definicja</p>
                    <h2 className="text-3xl font-semibold tracking-tight">{currentTask.prompt}</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">Twoja odpowiedź</label>
                    <input
                      ref={inputRef}
                      type="text"
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      placeholder="Wpisz odpowiedź"
                      className="w-full border border-neutral-200 rounded-2xl px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                      disabled={loading}
                    />
                    {hintShown && (
                      <p className="text-xs text-neutral-400 mt-2">
                        Podpowiedź: {currentTask.answer[0]}{HINT_MASK_CHAR.repeat(Math.max(currentTask.answer.length - 1, 0))}
                      </p>
                    )}
                  </div>

                  {pendingTypo ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-sm">
                      <p className="font-medium text-amber-700">Prawie! 1 literówka.</p>
                      <div className="mt-3 flex gap-3">
                        <button type="button" onClick={() => handleTypoDecision(true)} className="px-4 py-2 rounded-full bg-amber-600 text-white text-xs font-medium">
                          Zaliczyć
                        </button>
                        <button type="button" onClick={() => handleTypoDecision(false)} className="px-4 py-2 rounded-full border border-amber-200 text-xs font-medium">
                          Nie zaliczać
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleHint}
                        className="px-4 py-2 rounded-full border border-neutral-200 text-sm font-medium hover:border-neutral-400"
                      >
                        Podpowiedź
                      </button>
                      <button
                        type="submit"
                        disabled={loading || !userAnswer.trim()}
                        className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
                      >
                        Sprawdź (Enter)
                      </button>
                      <button
                        type="button"
                        onClick={handleRevealAnswer}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Nie znasz odpowiedzi?
                      </button>
                    </div>
                  )}
                </form>
              )}

              {currentTask.taskType === 'abcd' && currentTask.options && (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-widest mb-2">Definicja</p>
                    <h2 className="text-3xl font-semibold tracking-tight">{currentTask.prompt}</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {currentTask.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAbcdSelect(idx)}
                        disabled={loading}
                        className="group w-full text-left px-4 py-3 border border-neutral-200 rounded-2xl text-sm hover:border-blue-400 hover:bg-blue-50 transition-colors"
                      >
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-neutral-200 text-xs font-semibold mr-3 group-hover:border-blue-400">
                          {idx + 1}
                        </span>
                        {opt}
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={handleRevealAnswer} className="text-sm text-blue-600 hover:text-blue-700">
                    Nie znasz odpowiedzi?
                  </button>
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <form onSubmit={handleSentenceSubmit} className="space-y-6">
                  <div>
                    <p className="text-xs text-neutral-400 uppercase tracking-widest mb-2">Prompt</p>
                    <h2 className="text-2xl font-semibold tracking-tight">{currentTask.prompt}</h2>
                    <p className="text-sm text-neutral-500 mt-2">Create a sentence with this word.</p>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium mt-3">
                      {currentTask.answer}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-500 mb-2">Twoje zdanie</label>
                    <textarea
                      ref={textareaRef}
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      placeholder="Napisz zdanie…"
                      rows={4}
                      className="w-full border border-neutral-200 rounded-2xl px-4 py-3 text-sm focus:border-blue-500 focus:outline-none resize-none"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleHint}
                      className="px-4 py-2 rounded-full border border-neutral-200 text-sm font-medium"
                    >
                      Hint
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !userAnswer.trim()}
                      className="px-6 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
                    >
                      Check
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
