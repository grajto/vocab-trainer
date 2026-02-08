'use client'

import { useState, useEffect } from 'react'

interface DeckStat {
  deckId: string
  deckName: string
  cardCount: number
  dueCount: number
  levelDistribution: Record<string, number>
  percentLevel4: number
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
}

interface StatsData {
  global: {
    sessionsToday: number
    sessionsThisWeek: number
    streakDays: number
    avgAccuracy: number
  }
  deckStats: DeckStat[]
  history: HistoryItem[]
}

export function StatsView() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-neutral-400 py-8 text-center">Loading stats…</p>
  if (!stats) return <p className="text-sm text-red-500 py-8 text-center">Failed to load stats.</p>

  return (
    <div className="space-y-8">
      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: stats.global.sessionsToday, label: 'Today' },
          { value: stats.global.sessionsThisWeek, label: 'This Week' },
          { value: stats.global.streakDays, label: 'Day Streak' },
          { value: `${stats.global.avgAccuracy}%`, label: 'Avg Accuracy' },
        ].map(item => (
          <div key={item.label} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-center">
            <p className="text-xl font-bold tabular-nums">{item.value}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Per deck stats */}
      <div>
        <h3 className="text-sm font-medium text-neutral-500 mb-3">Per Deck</h3>
        <div className="space-y-2">
          {stats.deckStats.map(deck => (
            <div key={deck.deckId} className="bg-white border border-neutral-200 rounded-xl px-5 py-4">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-sm">{deck.deckName}</p>
                <p className="text-xs text-neutral-400">{deck.cardCount} cards · {deck.dueCount} due</p>
              </div>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map(level => {
                  const count = deck.levelDistribution[level] || 0
                  const shades = {
                    1: 'bg-neutral-100 text-neutral-600',
                    2: 'bg-neutral-200 text-neutral-700',
                    3: 'bg-neutral-300 text-neutral-800',
                    4: 'bg-neutral-800 text-white',
                  }
                  return (
                    <div key={level} className={`flex-1 ${shades[level]} rounded-lg py-2 text-center`}>
                      <p className="text-sm font-semibold tabular-nums">{count}</p>
                      <p className="text-[10px] opacity-70">L{level}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-neutral-400 mt-2">Mastered (L4): {deck.percentLevel4}%</p>
            </div>
          ))}
          {stats.deckStats.length === 0 && <p className="text-sm text-neutral-400 py-4 text-center">No decks yet.</p>}
        </div>
      </div>

      {/* Session history */}
      <div>
        <h3 className="text-sm font-medium text-neutral-500 mb-3">Recent Sessions</h3>
        <div className="space-y-1">
          {stats.history.map(session => (
            <div key={session.id} className="bg-white border border-neutral-200 rounded-lg px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <span className="font-medium">{session.deckName}</span>
                <span className="text-neutral-300 mx-1.5">·</span>
                <span className="text-neutral-500 capitalize">{session.mode}</span>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-medium">{session.accuracy}%</span>
                <span className="text-neutral-400 ml-2">{session.completedCount}/{session.targetCount}</span>
              </div>
            </div>
          ))}
          {stats.history.length === 0 && <p className="text-sm text-neutral-400 py-4 text-center">No sessions yet.</p>}
        </div>
      </div>
    </div>
  )
}
