'use client'

import { useState, useEffect } from 'react'
import { Link } from 'lucide-react'
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
  deckStats: DeckStat[]
  folderStats?: FolderStat[]
  hardestCards?: HardestCard[]
  history: HistoryItem[]
}

export function StatsView() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'decks' | 'folders' | 'hardest' | 'history'>('overview')

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

  const topMastered = [...stats.deckStats]
    .sort((a, b) => b.percentLevel4 - a.percentLevel4)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Tabs - folder page style */}
      <div className="flex gap-6 pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
        {[
          { id: 'overview', label: 'Przegląd' },
          { id: 'decks', label: 'Zestawy' },
          { id: 'folders', label: 'Foldery' },
          { id: 'hardest', label: 'Najtrudniejsze' },
          { id: 'history', label: 'Historia' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className="border-b-2 pb-2 text-sm font-semibold transition-colors"
            style={{
              borderColor: tab === t.id ? 'var(--primary)' : 'transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { 
                icon: Calendar,
                value: stats.global.sessionsThisWeek, 
                label: 'Sesje (7 dni)', 
                bg: 'var(--primary-soft)',
                color: 'var(--primary)'
              },
              { 
                icon: TrendingUp,
                value: `${stats.global.minutesLast7Days} min`, 
                label: 'Czas (7 dni)', 
                bg: 'var(--surface-muted)',
                color: 'var(--text)'
              },
              { 
                icon: BarChart3,
                value: stats.global.streakDays, 
                label: 'Seria dni', 
                bg: 'var(--primary-soft)',
                color: 'var(--primary)'
              },
              { 
                icon: TrendingUp,
                value: `${stats.global.avgAccuracy}%`, 
                label: 'Śr. trafność', 
                bg: 'var(--surface-muted)',
                color: 'var(--text)'
              },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="rounded-xl px-4 py-4 space-y-2" 
                style={{ background: item.bg }}
              >
                <item.icon size={18} style={{ color: item.color }} />
                <p className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                  {item.value}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Charts with proper constraints */}
          {stats.sessionsByDay && stats.sessionsByDay.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div 
                className="p-5 rounded-xl" 
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Sesje w czasie (7 dni)
                </h3>
                <div className="flex items-end gap-2 h-32 overflow-hidden">
                  {stats.sessionsByDay.map((day, idx) => {
                    const maxCount = Math.max(...stats.sessionsByDay!.map(d => d.count), 1)
                    const heightPercent = Math.min(100, (day.count / maxCount) * 100)
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full rounded-t-lg transition-all"
                          style={{ 
                            height: `${Math.max(10, heightPercent)}%`,
                            background: 'var(--primary)',
                            minHeight: '4px'
                          }} 
                        />
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {day.date.slice(5)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div 
                className="p-5 rounded-xl" 
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>
                  Czas nauki (7 dni)
                </h3>
                <div className="flex items-end gap-2 h-32 overflow-hidden">
                  {stats.sessionsByDay.map((day, idx) => {
                    const maxMinutes = Math.max(...stats.sessionsByDay!.map(d => d.minutes), 1)
                    const heightPercent = Math.min(100, (day.minutes / maxMinutes) * 100)
                    
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className="w-full rounded-t-lg transition-all"
                          style={{ 
                            height: `${Math.max(10, heightPercent)}%`,
                            background: 'var(--warning)',
                            minHeight: '4px'
                          }} 
                        />
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {day.date.slice(5)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top mastered decks */}
          {topMastered.length > 0 && (
            <div 
              className="p-5 rounded-xl" 
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Najlepiej opanowane zestawy
              </h3>
              <div className="space-y-2">
                {topMastered.map((deck) => (
                  <div 
                    key={deck.deckId} 
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--surface-muted)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                      {deck.deckName}
                    </span>
                    <span 
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ background: 'var(--success)', color: '#fff' }}
                    >
                      {deck.percentLevel4}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Other tabs remain simple for now */}
      {tab !== 'overview' && (
        <div className="py-12 text-center">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Zakładka {tab} będzie dostępna wkrótce
          </p>
        </div>
      )}
    </div>
  )
}

