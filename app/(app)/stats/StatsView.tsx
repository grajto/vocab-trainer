'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Calendar } from 'lucide-react'

interface DeckStat {
  deckId: string
  deckName: string
  cardCount: number
  dueCount: number
  levelDistribution: Record<string, number>
  percentLevel4: number
}

interface FolderStat {
  folderId: string
  folderName: string
  deckCount: number
  totalCards: number
  totalDue: number
  avgMastery: number
}

interface HardestCard {
  cardId: string
  front: string
  back: string
  totalWrong: number
  todayWrongCount: number
  level: number
  deckName: string
  deckId: string
}

interface HistoryItem {
  id: string
  mode: string
  deckName: string
  targetCount: number
  completedCount: number
  accuracy: number
  startedAt: string
  endedAt: string | null
  durationSeconds?: number
}

interface StatsData {
  global: {
    sessionsToday: number
    sessionsThisWeek: number
    minutesLast7Days: number
    streakDays: number
    avgAccuracy: number
    levelDistribution?: Record<string, number>
  }
  sessionsByDay?: Array<{ date: string; count: number; minutes: number }>
  problematicDecks?: Array<{ deckId: string; deckName: string; totalWrong: number }>
  wordProblems?: Array<{ cardId: string; deckId: string; front: string; wrong: number; correct: number }>
  deckStats: DeckStat[]
  folderStats?: FolderStat[]
  hardestCards?: HardestCard[]
  history: HistoryItem[]
}

const modeOptions = ['all', 'translate', 'abcd', 'sentence', 'describe', 'mixed', 'test'] as const
type ModeFilter = (typeof modeOptions)[number]

export function StatsView() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modeFilter, setModeFilter] = useState<ModeFilter>('all')
  const [range, setRange] = useState<'7' | '30' | '365'>('7')

  useEffect(() => {
    fetch('/api/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ładowanie statystyk…</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--danger)' }}>Nie udało się załadować statystyk.</p>
      </div>
    )
  }

  const historyFiltered = stats.history.filter((h) => {
    if (!h.startedAt) return false
    const modeOk = modeFilter === 'all' || h.mode === modeFilter
    const days = parseInt(range, 10)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const dateOk = new Date(h.startedAt) >= startDate
    return modeOk && dateOk
  })

  const summary = historyFiltered.reduce(
    (acc, item) => {
      acc.sessions += 1
      acc.questions += Number(item.completedCount || item.targetCount || 0)
      if (item.durationSeconds) acc.minutes += Math.round(Number(item.durationSeconds) / 60)
      return acc
    },
    { sessions: 0, questions: 0, minutes: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Zakres</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="text-xs focus:outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          >
            <option value="7">7 dni</option>
            <option value="30">30 dni</option>
            <option value="365">365 dni</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: 'var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Tryb</span>
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value as typeof modeFilter)}
            className="text-xs focus:outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
          >
            {modeOptions.map((mode) => (
              <option key={mode} value={mode}>
                {mode === 'all'
                  ? 'Wszystkie'
                  : mode === 'abcd'
                    ? 'ABCD'
                    : mode === 'describe'
                      ? 'Opisz'
                      : mode === 'mixed'
                        ? 'Mix'
                        : mode === 'test'
                          ? 'Test'
                          : mode === 'sentence'
                            ? 'Zdania'
                            : 'Tłumaczenie'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Calendar, value: stats.global.sessionsThisWeek, label: 'Sesje (7 dni)', color: 'var(--primary)' },
          { icon: TrendingUp, value: `${stats.global.minutesLast7Days} min`, label: 'Czas (7 dni)', color: 'var(--text)' },
          { icon: BarChart3, value: stats.global.streakDays, label: 'Seria dni', color: 'var(--primary)' },
          { icon: TrendingUp, value: `${stats.global.avgAccuracy}%`, label: 'Śr. trafność', color: 'var(--text)' },
        ].map((item, idx) => (
          <div key={idx} className="rounded-xl border px-4 py-4 space-y-2" style={{ borderColor: 'var(--border)' }}>
            <item.icon size={18} style={{ color: item.color }} />
            <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
              {item.value}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {stats.sessionsByDay && stats.sessionsByDay.length > 0 && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
            Kalendarz aktywności
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {stats.sessionsByDay.map((day, idx) => {
              const color =
                day.count >= 3 ? '#22c55e' : day.count > 0 ? '#f59e0b' : '#ef4444'
              return (
                <div
                  key={`${day.date}-${idx}`}
                  className="rounded-lg p-2 text-center"
                  style={{ background: '#f8fafc', border: `1px solid ${color}` }}
                >
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    {day.date}
                  </p>
                  <p className="text-sm font-bold" style={{ color }}>
                    {day.count}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Problematyczne zestawy
          </h3>
          {stats.problematicDecks && stats.problematicDecks.length > 0 ? (
            stats.problematicDecks.map((deck) => (
              <div key={deck.deckId} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {deck.deckName}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#fee2e2', color: '#b91c1c' }}>
                  {deck.totalWrong} bł.
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Brak danych o trudnościach.
            </p>
          )}
        </div>

        <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Najtrudniejsze słowa
          </h3>
          {stats.wordProblems && stats.wordProblems.length > 0 ? (
            stats.wordProblems.slice(0, 5).map((word) => (
              <div key={word.cardId} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                <span className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
                  {word.front || 'Słówko'}
                </span>
                <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: '#fef3c7', color: '#b45309' }}>
                  {word.wrong} bł.
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Brak problematycznych słówek.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border p-5 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Historia sesji
          </h3>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {summary.sessions} sesji · {summary.questions} pytań · {summary.minutes} min
          </p>
        </div>
        {historyFiltered.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Brak sesji w wybranym filtrze.
          </p>
        ) : (
          <div className="space-y-2">
            {historyFiltered.map((item) => (
              <div key={item.id} className="grid grid-cols-4 items-center rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>
                <span className="font-semibold truncate">{item.deckName}</span>
                <span>{item.mode}</span>
                <span>{item.completedCount ?? item.targetCount} zadań</span>
                <span className="text-right" style={{ color: 'var(--text-muted)' }}>
                  {item.startedAt ? new Date(item.startedAt).toLocaleDateString('pl-PL') : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
