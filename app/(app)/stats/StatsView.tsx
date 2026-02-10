'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

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

  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Loading stats…</p>
  if (!stats) return <p className="text-sm text-red-500 py-8 text-center">Failed to load stats.</p>

  const topMastered = [...stats.deckStats]
    .sort((a, b) => b.percentLevel4 - a.percentLevel4)
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['overview', 'decks', 'folders', 'hardest', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-medium rounded-xl transition-colors capitalize ${
              tab === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: stats.global.sessionsThisWeek, label: 'Sesje (7 dni)', bg: 'bg-gradient-to-br from-blue-500 to-violet-600 text-white' },
              { value: `${stats.global.minutesLast7Days} min`, label: 'Czas (7 dni)', bg: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' },
              { value: stats.global.streakDays, label: 'Streak', bg: 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white' },
              { value: `${stats.global.avgAccuracy}%`, label: 'Śr. accuracy', bg: 'bg-gradient-to-br from-rose-400 to-pink-500 text-white' },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-2xl px-4 py-4 text-center shadow-md`}>
                <p className="text-xl font-bold tabular-nums">{item.value}</p>
                <p className="text-[10px] opacity-80 mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>

          {stats.sessionsByDay && stats.sessionsByDay.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">Sesje w czasie (7 dni)</h3>
                <div className="flex items-end gap-2 h-24">
                  {stats.sessionsByDay.map(day => (
                    <div key={day.date} className="flex-1 text-center">
                      <div className="bg-blue-400 rounded-t-lg" style={{ height: `${Math.max(10, day.count * 10)}px` }} />
                      <p className="text-[10px] text-slate-400 mt-1">{day.date}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-md">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">Czas nauki (7 dni)</h3>
                <div className="flex items-end gap-2 h-24">
                  {stats.sessionsByDay.map(day => (
                    <div key={day.date} className="flex-1 text-center">
                      <div className="bg-amber-400 rounded-t-lg" style={{ height: `${Math.max(10, day.minutes / 2)}px` }} />
                      <p className="text-[10px] text-slate-400 mt-1">{day.date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Global level distribution */}
          {stats.global.levelDistribution && (
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Level Distribution (All Cards)</h3>
              <div className="flex gap-2">
                {([1, 2, 3, 4] as const).map(level => {
                  const count = stats.global.levelDistribution?.[level] || 0
                  const shades = {
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
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-500 mb-3">Najlepiej opanowane zestawy</h3>
              <div className="space-y-2">
                {topMastered.map(deck => (
                  <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{deck.deckName}</span>
                    <span className="text-emerald-600 font-semibold">{deck.percentLevel4}%</span>
                  </Link>
                ))}
                {topMastered.length === 0 && <p className="text-xs text-slate-400">Brak danych.</p>}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-500 mb-3">Najbardziej problematyczne</h3>
              <div className="space-y-2">
                {(stats.problematicDecks || []).map(deck => (
                  <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{deck.deckName}</span>
                    <span className="text-rose-600 font-semibold">{deck.totalWrong} błędów</span>
                  </Link>
                ))}
                {(!stats.problematicDecks || stats.problematicDecks.length === 0) && (
                  <p className="text-xs text-slate-400">Brak danych.</p>
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
            <Link key={deck.deckId} href={`/decks/${deck.deckId}`} prefetch={true} className="block bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-center mb-3">
                <p className="font-medium text-sm text-slate-900">{deck.deckName}</p>
                <p className="text-xs text-slate-400">{deck.cardCount} cards · {deck.dueCount} due</p>
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
              <p className="text-[10px] text-slate-400 mt-2">Mastered (L4): {deck.percentLevel4}%</p>
            </Link>
          ))}
          {stats.deckStats.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No decks yet.</p>}
        </div>
      )}

      {/* Per folder stats */}
      {tab === 'folders' && (
        <div className="space-y-2">
          {(stats.folderStats || []).map(folder => (
            <Link key={folder.folderId} href={`/folders/${folder.folderId}`} prefetch={true} className="block bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm hover:border-indigo-300 transition-colors">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm text-slate-900">{folder.folderName}</p>
                <p className="text-xs text-slate-400">{folder.deckCount} decks</p>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>{folder.totalCards} cards</span>
                <span>{folder.totalDue} due</span>
                <span>Mastery: {folder.avgMastery}%</span>
              </div>
            </Link>
          ))}
          {(!stats.folderStats || stats.folderStats.length === 0) && <p className="text-sm text-slate-400 py-4 text-center">No folders yet.</p>}
        </div>
      )}

      {/* Hardest cards */}
      {tab === 'hardest' && (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 mb-2">Cards sorted by total errors (most errors first)</p>
          {(stats.hardestCards || []).map(card => (
            <div key={card.cardId} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium text-slate-900">{card.front}</span>
                <span className="text-indigo-300 mx-2">→</span>
                <span className="text-slate-600">{card.back}</span>
                <span className="text-slate-300 mx-2">·</span>
                <span className="text-xs text-slate-400">{card.deckName}</span>
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
          {(!stats.hardestCards || stats.hardestCards.length === 0) && <p className="text-sm text-slate-400 py-4 text-center">No error data yet. Start learning!</p>}
        </div>
      )}

      {/* Session history */}
      {tab === 'history' && (
        <div className="space-y-1">
          {stats.history.map(session => (
            <div key={session.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center text-sm">
              <div>
                <span className="font-medium text-slate-900">{session.deckName}</span>
                <span className="text-slate-300 mx-1.5">·</span>
                <span className="text-slate-500 capitalize">{session.mode}</span>
              </div>
              <div className="text-right tabular-nums">
                <span className="font-medium text-indigo-600">{session.accuracy}%</span>
                <span className="text-slate-400 ml-2">{session.completedCount}/{session.targetCount}</span>
              </div>
            </div>
          ))}
          {stats.history.length === 0 && <p className="text-sm text-slate-400 py-4 text-center">No sessions yet.</p>}
        </div>
      )}
    </div>
  )
}
