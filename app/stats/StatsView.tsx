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

  if (loading) return <p className="text-gray-500">Loading stats...</p>
  if (!stats) return <p className="text-red-500">Failed to load stats.</p>

  return (
    <div className="space-y-6">
      {/* Global stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">{stats.global.sessionsToday}</p>
          <p className="text-xs text-gray-500">Sessions Today</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">{stats.global.sessionsThisWeek}</p>
          <p className="text-xs text-gray-500">This Week</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">{stats.global.streakDays}</p>
          <p className="text-xs text-gray-500">Day Streak</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow text-center">
          <p className="text-2xl font-bold">{stats.global.avgAccuracy}%</p>
          <p className="text-xs text-gray-500">Avg Accuracy</p>
        </div>
      </div>

      {/* Per deck stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Per Deck</h3>
        <div className="space-y-3">
          {stats.deckStats.map(deck => (
            <div key={deck.deckId} className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{deck.deckName}</h4>
                <span className="text-sm text-gray-500">{deck.cardCount} cards, {deck.dueCount} due</span>
              </div>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map(level => {
                  const count = deck.levelDistribution[level] || 0
                  const colors = { 1: 'bg-red-200', 2: 'bg-yellow-200', 3: 'bg-blue-200', 4: 'bg-green-200' }
                  return (
                    <div key={level} className={`flex-1 ${colors[level]} rounded p-2 text-center text-sm`}>
                      <p className="font-bold">{count}</p>
                      <p className="text-xs">L{level}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-1">Mastered (L4): {deck.percentLevel4}%</p>
            </div>
          ))}
          {stats.deckStats.length === 0 && <p className="text-gray-500">No decks yet.</p>}
        </div>
      </div>

      {/* Session history */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Sessions</h3>
        <div className="space-y-2">
          {stats.history.map(session => (
            <div key={session.id} className="bg-white p-3 rounded-lg shadow flex justify-between items-center text-sm">
              <div>
                <span className="font-medium">{session.deckName}</span>
                <span className="text-gray-400 mx-1">·</span>
                <span className="capitalize">{session.mode}</span>
              </div>
              <div className="text-right">
                <span className="font-medium">{session.accuracy}%</span>
                <span className="text-gray-400 ml-2">{session.completedCount}/{session.targetCount}</span>
              </div>
            </div>
          ))}
          {stats.history.length === 0 && <p className="text-gray-500">No sessions yet.</p>}
        </div>
      </div>
    </div>
  )
}
