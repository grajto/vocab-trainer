'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { checkAnswerWithTypo, generateHint } from '@/src/lib/answerCheck'
import { useSound } from '@/src/lib/SoundProvider'

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
  const [aiInfo, setAiInfo] = useState<{ used: boolean; latencyMs: number } | null>(null)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Typo state
  const [typoState, setTypoState] = useState<{ expected: string; userAnswer: string } | null>(null)

  // Hint state
  const [showHint, setShowHint] = useState(false)

  // Shuffle toggle (persisted in localStorage)
  const [shuffleEnabled, setShuffleEnabled] = useState(false)

  // Track per-card state (attempts, hints used)
  const taskStatesRef = useRef<Map<string, TaskState>>(new Map())

  // Track accuracy locally
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)
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
      let parsed: Task[] = JSON.parse(stored)
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
        setCurrentIndex(prev => prev + 1)
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
      setFeedback({ correct: true, message: 'Correct' })
      playCorrect()
    } else {
      state.wasWrongBefore = true
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
      setFeedback({ correct: true, message: 'Correct' })
      playCorrect()
    } else {
      state.wasWrongBefore = true
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
    })

    advanceToNext(correct ? FEEDBACK_DELAY_CORRECT : FEEDBACK_DELAY_WRONG)
  }

  function handleAbcdSkip() {
    if (!currentTask || feedback) return
    const state = getTaskState(currentTask.cardId)
    state.attempts++
    setSelectedOption(null)
    state.wasWrongBefore = true
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
    if (!userAnswer.trim() || !currentTask) return

    const state = getTaskState(currentTask.cardId)
    state.attempts++

    setLoading(true)
    try {
      const res = await fetch('/api/check-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          phrase: currentTask.requiredEn || currentTask.answer,
          sentence: userAnswer,
          promptPl: currentTask.promptPl || currentTask.prompt,
        }),
      })
      const data = await res.json()
      const correct = !!data.ok
      setAiInfo({
        used: !!data.ai_used,
        latencyMs: Number(data.ai_latency_ms || 0),
      })

      if (correct) {
        state.wasWrongBefore = state.wasWrongBefore || state.attempts > 1
        setAnsweredCount(prev => prev + 1)
        setCorrectCount(prev => prev + 1)
        setFeedback({ correct: true, message: data.message_pl || 'Correct' })
        playCorrect()
      } else {
        state.wasWrongBefore = true
        const msg = data.suggested_fix
          ? `${data.message_pl || 'Incorrect'}\nSuggested: ${data.suggested_fix}`
          : (data.message_pl || `Use: ${currentTask.answer}`)
        setFeedback({ correct: false, message: msg })
        playWrong()
        requeueCard(currentTask)
      }

      // Fire-and-forget save to backend
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
      })

      advanceToNext(correct ? FEEDBACK_DELAY_CORRECT_SLOW : FEEDBACK_DELAY_WRONG_SLOW)
    } catch {
      // On network error, count as wrong
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
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b2b] text-slate-200">
        <div className="text-center">
          <p className="text-sm text-slate-400 mb-3">No session data found.</p>
          <button onClick={() => router.push('/learn')} className="text-sm text-indigo-600 underline underline-offset-2">
            Go to Learn
          </button>
        </div>
      </div>
    )
  }

  if (sessionDone) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0b2b] text-slate-100">
        <div className="text-center max-w-xs mx-4">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-2">Session Complete</p>
          <p className="text-5xl font-bold tabular-nums mb-1 text-indigo-300">{accuracy}%</p>
          <p className="text-sm text-slate-400 mb-8">accuracy</p>
          <div className="space-y-2">
            <button onClick={() => router.push('/learn')} className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-2.5 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 transition-all">
              New Session
            </button>
            <button onClick={() => router.push('/')} className="block w-full border border-slate-700 py-2.5 rounded-xl text-sm text-slate-200 hover:border-indigo-400 transition-colors">
              Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progress = ((currentIndex + 1) / tasks.length) * 100
  const hintText = showHint && currentTask ? generateHint(currentTask.expectedAnswer || currentTask.answer) : ''

  return (
    <div className="min-h-screen bg-[#0b0b2b] text-slate-100">
      {/* Progress bar */}
      <div className="border-b border-slate-800/60 bg-[#0f1237]/80 backdrop-blur-sm px-6 py-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
              {currentIndex + 1} / {tasks.length}
            </span>
            <div className="flex-1 bg-slate-800/60 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-emerald-400 to-indigo-400 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 tabular-nums">{accuracy}%</span>
            <button
              onClick={toggleShuffle}
              className={`text-xs transition-colors ${shuffleEnabled ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
              title={shuffleEnabled ? 'Shuffle ON' : 'Shuffle OFF'}
            >
              🔀
            </button>
            <button
              onClick={toggleSound}
              className="text-xs text-slate-400 hover:text-indigo-300 transition-colors"
              title={soundEnabled ? 'Sound ON' : 'Sound OFF'}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
          {tasks.length <= 40 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(6px,1fr))] gap-1">
              {tasks.map((_, idx) => {
                const isDone = idx < currentIndex
                const isCurrent = idx === currentIndex
                return (
                  <span
                    key={idx}
                    className={`h-1 rounded-full ${
                      isCurrent ? 'bg-indigo-300' : isDone ? 'bg-emerald-400/80' : 'bg-slate-700/80'
                    }`}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.4em] mb-4">
            {currentTask.taskType === 'sentence' ? 'sentence' : currentTask.taskType}
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            {currentTask.prompt}
          </h2>
          {currentTask.taskType === 'sentence' && (
            <p className="text-sm text-slate-300 mt-2 mb-8">Create a sentence with this word.</p>
          )}
          {currentTask.taskType !== 'sentence' && <div className="mb-10" />}

          {showHint && !feedback && !typoState && (
            <div className="mb-6 text-sm text-amber-200 bg-amber-500/10 border border-amber-400/30 rounded-lg px-4 py-2 inline-block font-mono tracking-widest">
              {hintText}
            </div>
          )}

          {typoState && !feedback && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-5 py-4 text-sm">
                <p className="text-amber-200 font-medium mb-2">One typo detected!</p>
                <p className="text-slate-200">
                  Your answer: <span className="font-medium">{typoState.userAnswer}</span>
                </p>
                <p className="text-slate-200">
                  Expected: <span className="font-medium">{typoState.expected}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleTypoDecision(true)}
                  className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors"
                >
                  ✓ Accept
                </button>
                <button
                  onClick={() => handleTypoDecision(false)}
                  className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          )}

          {feedback ? (
            <div className={`inline-block px-5 py-3 rounded-xl text-sm font-medium ${
              feedback.correct
                ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-400/30'
                : 'bg-rose-500/10 text-rose-200 border border-rose-400/30'
            }`}>
              {feedback.correct ? '✓ ' : '✗ '}
              {feedback.message.split('\n').map((line, i) => (
                <span key={i}>{i > 0 && <br />}{line}</span>
              ))}
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
                    className="w-full border border-slate-700 rounded-xl px-4 py-3 text-center text-lg bg-slate-900/60 text-slate-100 focus:border-indigo-400 focus:outline-none transition-colors"
                  />
                  <div className="flex gap-2">
                    {!showHint && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="px-4 py-3 border border-amber-400/40 text-amber-200 rounded-xl text-sm hover:bg-amber-500/10 transition-colors"
                      >
                        💡 Hint
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!userAnswer.trim()}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 transition-all"
                    >
                      Check
                    </button>
                  </div>
                </form>
              )}

              {currentTask.taskType === 'abcd' && currentTask.options && (
                <div className="space-y-2">
                  {currentTask.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAbcdSelect(opt)}
                      disabled={!!feedback}
                      className={`w-full text-left px-5 py-4 border rounded-2xl text-sm transition-all ${
                        feedback
                          ? opt === currentTask.answer
                            ? 'border-emerald-400/70 bg-emerald-500/10 text-emerald-100'
                            : opt === selectedOption
                              ? 'border-rose-400/70 bg-rose-500/10 text-rose-100'
                              : 'border-slate-700 text-slate-300'
                          : 'border-slate-700 hover:border-indigo-400/60 hover:bg-indigo-500/10 text-slate-100'
                      }`}
                    >
                      <span className="inline-flex items-center justify-center w-7 h-7 mr-3 rounded-full bg-slate-800 text-slate-200 text-xs font-semibold">
                        {idx + 1}
                      </span>
                      {opt}
                    </button>
                  ))}
                  <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span>Tip: press 1–4</span>
                    <button
                      type="button"
                      onClick={handleAbcdSkip}
                      className="text-indigo-300 hover:text-indigo-200 transition-colors"
                    >
                      I don’t know
                    </button>
                  </div>
                </div>
              )}

              {currentTask.taskType === 'sentence' && (
                <div className="space-y-5">
                  {/* Required EN word as pill/chip */}
                  <div className="flex justify-center">
                    <span className="inline-block bg-indigo-500/20 text-indigo-200 font-semibold px-4 py-1.5 rounded-full text-base tracking-wide">
                      {currentTask.requiredEn || currentTask.answer}
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
                        if (userAnswer.trim() && !loading) {
                          handleSentenceSubmit(e as unknown as React.FormEvent)
                        }
                      }
                    }}
                    placeholder="Write one sentence…"
                    autoFocus
                    rows={3}
                    className="w-full border border-slate-700 rounded-xl px-4 py-3 text-sm bg-slate-900/60 text-slate-100 focus:border-indigo-400 focus:outline-none resize-none transition-colors"
                    disabled={loading}
                  />

                  {/* Hint + Check buttons */}
                  <div className="flex gap-2">
                    {!showHint && (
                      <button
                        type="button"
                        onClick={handleHintClick}
                        className="px-4 py-3 border border-amber-400/40 text-amber-200 rounded-xl text-sm hover:bg-amber-500/10 transition-colors"
                      >
                        💡 Hint
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={e => {
                        if (userAnswer.trim() && !loading) {
                          handleSentenceSubmit(e as unknown as React.FormEvent)
                        }
                      }}
                      disabled={loading || !userAnswer.trim()}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 transition-all"
                    >
                      {loading ? 'Checking…' : 'Check'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 text-center">Ctrl+Enter to submit</p>
                  {process.env.NODE_ENV === 'development' && aiInfo && (
                    <p className="text-[11px] text-slate-400 text-center">
                      AI: {aiInfo.used ? 'ON' : 'OFF'} ({aiInfo.latencyMs} ms)
                    </p>
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
