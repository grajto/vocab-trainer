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
                    1: 'bg-red-100 text-red-700',
                    2: 'bg-amber-100 text-amber-700',
                    3: 'bg-blue-100 text-blue-700',
                    4: 'bg-emerald-100 text-emerald-700',
                  }
                  return (
                    <div key={level} className={`flex-1 ${shades[level]} rounded-lg py-3 text-center`}>
                      <p className="text-lg font-bold tabular-nums">{count}</p>
                      <p className="text-[10px] opacity-70">Level {level}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-[var(--radius)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Najlepiej opanowane zestawy</h3>
              <div className="space-y-2">
                {topMastered.map(deck => (
                  <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text)' }}>{deck.deckName}</span>
                    <span className="text-emerald-600 font-semibold" style={{ color: '#059669' }}>{deck.percentLevel4}%</span>
                  </Link>
                ))}
                {topMastered.length === 0 && <p className="text-xs" style={{ color: 'var(--muted)' }}>Brak danych.</p>}
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius)]" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--muted)' }}>Najbardziej problematyczne</h3>
              <div className="space-y-2">
                {(stats.problematicDecks || []).map(deck => (
                  <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--text)' }}>{deck.deckName}</span>
                    <span className="text-rose-600 font-semibold" style={{ color: '#dc2626' }}>{deck.totalWrong} błędów</span>
                  </Link>
                ))}
                {(!stats.problematicDecks || stats.problematicDecks.length === 0) && (
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>Brak danych.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Per deck stats */}
      {tab === 'decks' && (
        <div className="space-y-2">
          {stats.deckStats.map(deck => (
            <Link key={deck.deckId} href={`/decks/${deck.deckId}`} prefetch={true} className="block px-5 py-4 rounded-[var(--radius)] transition-colors" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{deck.deckName}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{deck.cardCount} cards · {deck.dueCount} due</p>
              </div>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map(level => {
                  const count = deck.levelDistribution[level] || 0
                  const shades = {
                    1: 'bg-red-100 text-red-700',
                    2: 'bg-amber-100 text-amber-700',
                    3: 'bg-blue-100 text-blue-700',
                    4: 'bg-emerald-100 text-emerald-700',
                  }
                  return (
                    <div key={level} className={`flex-1 ${shades[level]} rounded-lg py-2 text-center`}>
                      <p className="text-sm font-semibold tabular-nums">{count}</p>
                      <p className="text-[10px] opacity-70">L{level}</p>
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>Mastered (L4): {deck.percentLevel4}%</p>
            </Link>
          ))}
          {stats.deckStats.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No decks yet.</p>}
        </div>
      )}

      {/* Per folder stats */}
      {tab === 'folders' && (
        <div className="space-y-2">
          {(stats.folderStats || []).map(folder => (
            <Link key={folder.folderId} href={`/folders/${folder.folderId}`} prefetch={true} className="block px-5 py-4 rounded-[var(--radius)] transition-colors" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm" style={{ color: 'var(--text)' }}>{folder.folderName}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{folder.deckCount} decks</p>
              </div>
              <div className="flex gap-4 mt-2 text-xs" style={{ color: 'var(--muted)' }}>
                <span>{folder.totalCards} cards</span>
                <span>{folder.totalDue} due</span>
                <span>Mastery: {folder.avgMastery}%</span>
              </div>
            </Link>
          ))}
          {(!stats.folderStats || stats.folderStats.length === 0) && <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No folders yet.</p>}
        </div>
      )}

      {/* Hardest cards */}
      {tab === 'hardest' && (
        <div className="space-y-1">
          <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>Cards sorted by total errors (most errors first)</p>
          {(stats.hardestCards || []).map(card => (
            <div key={card.cardId} className="rounded-lg px-4 py-3 flex justify-between items-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm">
                <span className="font-medium" style={{ color: 'var(--text)' }}>{card.front}</span>
                <span style={{ color: 'var(--gray400)' }} className="mx-2">→</span>
                <span style={{ color: 'var(--text)' }}>{card.back}</span>
                <span className="mx-2" style={{ color: 'var(--muted)' }}>·</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>{card.deckName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 font-medium tabular-nums">{card.totalWrong} errors</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  card.level === 1 ? 'bg-red-100 text-red-600' :
                  card.level === 2 ? 'bg-amber-100 text-amber-600' :
                  card.level === 3 ? 'bg-blue-100 text-blue-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  L{card.level}
                </span>
              </div>
            </div>
          ))}
          {(!stats.hardestCards || stats.hardestCards.length === 0) && <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No error data yet. Start learning!</p>}
        </div>
      )}

      {/* Session history */}
      {tab === 'history' && (
        <div className="space-y-1">
          {stats.history.map(session => (
            <div key={session.id} className="rounded-lg px-4 py-3 flex justify-between items-center text-sm" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div>
                <span className="font-medium" style={{ color: 'var(--text)' }}>{session.deckName}</span>
                <span className="mx-1.5" style={{ color: 'var(--muted)' }}>·</span>
                <span className="capitalize" style={{ color: 'var(--muted)' }}>{session.mode}</span>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-medium" style={{ color: 'var(--primary)' }}>{session.accuracy}%</span>
                <span className="ml-2" style={{ color: 'var(--muted)' }}>{session.completedCount}/{session.targetCount}</span>
              </div>
            </div>
          ))}
          {stats.history.length === 0 && <p className="text-sm py-4 text-center" style={{ color: 'var(--muted)' }}>No sessions yet.</p>}
        </div>
      )}
    </div>
  )
}
