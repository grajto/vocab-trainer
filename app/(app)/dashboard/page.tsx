/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarClock, FolderOpen, Zap } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { JumpBackInList } from './JumpBackInList'
import { getQuickSuggestions } from '@/src/lib/studyAlgorithm'

export const dynamic = 'force-dynamic'

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  let sessionsToday: any = { totalDocs: 0, docs: [] }
  let decks: any = { docs: [] }
  let folders: any = { docs: [] }
  let recentSessions: any = { docs: [] }
  let allSessionsYear: any = { docs: [] }

  try {
    const results = await Promise.all([
      // Only fetch COMPLETED sessions for today (endedAt must not be null)
      payload.find({ 
        collection: 'sessions', 
        where: { 
          owner: { equals: user.id }, 
          startedAt: { greater_than_equal: todayStart.toISOString() },
          endedAt: { not_equals: null }
        }, 
        limit: 100, 
        depth: 0 
      }),
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, sort: '-updatedAt', limit: 200, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, sort: '-updatedAt', limit: 200, depth: 0 }),
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id } }, sort: '-startedAt', limit: 30, depth: 0 }),
      // For streak calculation, get all sessions from the past year
      payload.find({ 
        collection: 'sessions', 
        where: { 
          owner: { equals: user.id }, 
          startedAt: { greater_than_equal: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString() },
          endedAt: { not_equals: null }
        }, 
        sort: '-startedAt', 
        limit: 0, 
        depth: 0 
      }),
    ])
    sessionsToday = results[0]
    decks = results[1]
    folders = results[2]
    recentSessions = results[3]
    allSessionsYear = results[4]
  } catch (err) {
    console.error('Dashboard data fetch error:', err)
  }

  const settings = getStudySettings(user as Record<string, unknown>)
  
  // Calculate time only from COMPLETED sessions
  const timeTodayMinutes = sessionsToday.docs.reduce((sum: number, s: any) => {
    if (!s.startedAt || !s.endedAt) return sum
    const start = new Date(s.startedAt)
    const end = new Date(s.endedAt)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return sum + Math.max(0, minutes) // Don't count negative times
  }, 0)

  // Calculate session data by day for streak
  const sessionsByDay = new Map<string, { sessions: number; minutes: number }>()
  for (const s of allSessionsYear.docs) {
    if (!s.startedAt || !s.endedAt) continue
    const start = new Date(s.startedAt)
    const end = new Date(s.endedAt)
    const key = getDayKey(start)
    const existing = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    existing.sessions += 1
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    existing.minutes += Math.max(0, minutes)
    sessionsByDay.set(key, existing)
  }

  let streakDays = 0
  const checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const dayStats = sessionsByDay.get(getDayKey(checkDate))
    if (dayStats && isDailyGoalMet(settings, dayStats.sessions, dayStats.minutes)) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else break
  }

  const deckMap = new Map<string, any>(decks.docs.map((d: any) => [String(d.id), d]))
  const recentDeckIds = new Set<string>()
  const jumpBackIn: Array<{ deckId: string; name: string; mode: string; sessionId: string; progress: string; progressRatio: number; startedAt: string }> = []

  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    const deck = deckMap.get(did)
    if (!deck) continue

    const completed = Number(s.completedCount ?? 0)
    const target = Number(s.targetCount ?? 0)
    const ratio = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0

    if ((s.endedAt === null || completed < target) && !jumpBackIn.find(item => item.sessionId === String(s.id))) {
      jumpBackIn.push({
        deckId: did,
        name: deck.name,
        mode: s.mode || 'translate',
        sessionId: String(s.id),
        progress: `${completed}/${target}`,
        progressRatio: ratio,
        startedAt: s.startedAt,
      })
    }

    recentDeckIds.add(did)
  }

  const recentDecks = decks.docs
    .filter((d: any) => recentDeckIds.has(String(d.id)))
    .slice(0, 6)
    .map((d: any) => ({
      id: String(d.id),
      name: d.name,
      count: Number(d.cardCount || 0),
      countLabel: `${Number(d.cardCount || 0)} słówek`,
      type: 'deck' as const,
    }))

  const recentFolders = folders.docs.slice(0, 4).map((f: any) => {
    const folderDecks = decks.docs.filter((d: any) => String(d.folder) === String(f.id))
    return {
      id: String(f.id),
      name: f.name,
      count: folderDecks.length,
      countLabel: `${folderDecks.length} zestawów`,
      type: 'folder' as const,
    }
  })

  const recents = [...recentDecks, ...recentFolders].slice(0, 8)

  // Get quick suggestions using algorithm
  const quickSuggestions = getQuickSuggestions(
    decks.docs.map((d: any) => ({
      id: String(d.id),
      name: d.name,
      cardCount: Number(d.cardCount || 0),
      updatedAt: d.updatedAt
    })),
    recentSessions.docs.map((s: any) => ({
      deck: String(s.deck),
      startedAt: s.startedAt,
      completedCount: Number(s.completedCount || 0),
      targetCount: Number(s.targetCount || 0),
      mode: s.mode || 'translate'
    })),
    3
  )

  const last3Days = [2, 1, 0].map(offset => {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    const key = getDayKey(d)
    const stats = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    return {
      label: d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      sessions: stats.sessions,
      minutes: stats.minutes,
      met: isDailyGoalMet(settings, stats.sessions, stats.minutes),
    }
  })

  const yesterday = last3Days[1]
  const recommendation = jumpBackIn.length > 0
    ? `Do dokończenia masz ${jumpBackIn.length} sesji — zacznij od "${jumpBackIn[0].name}".`
    : `Masz ${decks.docs.length} zestawów. Dziś zaplanuj minimum ${Math.max(1, settings.minSessionsPerDay)} sesję.`

  return (
    <div className="dashboard-wrap">
      <section className="dash-section">
        <h2 className="dash-title">Strona główna</h2>
        <div className="dash-stats-grid">
          <div className="dash-stat-card">
            <p className="dash-stat-label">Liczba sesji dzisiaj</p>
            <p className="dash-stat-value">{sessionsToday.totalDocs}</p>
          </div>
          <div className="dash-stat-card">
            <p className="dash-stat-label">Czas trenowania słówek</p>
            <p className="dash-stat-value">{timeTodayMinutes} min</p>
          </div>
          <div className="dash-stat-card">
            <p className="dash-stat-label">Seria dni</p>
            <p className="dash-stat-value">{streakDays} dni</p>
          </div>
          <div className="dash-stat-card dash-stat-card--wide">
            <p className="dash-stat-label">Co powtórzyć dziś</p>
            <p className="dash-stat-value dash-stat-value--small">{recommendation}</p>
          </div>
        </div>
      </section>

      {/* Quick Suggestions Section */}
      {quickSuggestions.length > 0 && (
        <section className="dash-section">
          <div className="dash-section__head">
            <h3><Zap size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />Szybkie propozycje</h3>
            <span className="text-sm text-slate-500">Krótkie sesje • 15 słówek max</span>
          </div>
          <div className="quick-suggestions-grid">
            {quickSuggestions.map((suggestion, idx) => (
              <Link 
                key={`${suggestion.deckId}-${idx}`}
                href={`/api/session/start?deckId=${suggestion.deckId}&mode=${suggestion.mode}&targetCount=${suggestion.cardCount}`}
                className="quick-suggestion-card"
              >
                <div className="quick-suggestion-header">
                  <h4 className="quick-suggestion-title">{suggestion.name}</h4>
                  <span className="quick-suggestion-badge">{suggestion.mode === 'translate' ? 'Tłumaczenie' : suggestion.mode === 'abcd' ? 'Test wyboru' : 'Zdania'}</span>
                </div>
                <p className="quick-suggestion-meta">{suggestion.cardCount} słówek • {suggestion.reason}</p>
                <button className="quick-suggestion-btn">
                  <Zap size={14} /> Zacznij teraz
                </button>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="dash-section">
        <div className="dash-section__head">
          <h3>Jump back in</h3>
          <Link href="/study">Nowa sesja →</Link>
        </div>
        <JumpBackInList initialItems={jumpBackIn} />
      </section>

      <section className="dash-section">
        <div className="dash-section__head">
          <h3>Recents</h3>
        </div>
        {recents.length === 0 ? (
          <div className="dash-empty">Brak ostatnich materiałów.</div>
        ) : (
          <div className="dash-recents-grid">
            {recents.map(item => (
              <Link key={`${item.type}-${item.id}`} href={item.type === 'deck' ? `/decks/${item.id}` : `/folders/${item.id}`} className="dash-recent-row">
                <span className="dash-recent-icon">
                  {item.type === 'deck' ? <BookOpen size={18} /> : <FolderOpen size={18} />}
                </span>
                <span className="dash-recent-main">
                  <strong>{item.name}</strong>
                  <small>{item.countLabel}</small>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dash-split-two">
        <div className="dash-card-box">
          <h3 className="dash-card-title"><CalendarClock size={18} /> Twoja aktywność</h3>
          <div className="dash-mini-calendar">
            {last3Days.map(day => (
              <div key={day.label} className={`dash-day ${day.sessions === 0 ? 'is-none' : day.met ? 'is-met' : 'is-partial'}`}>
                <span>{day.label}</span>
                <strong>{day.sessions} sesji</strong>
                <small>{day.minutes} min</small>
              </div>
            ))}
          </div>
          {yesterday.sessions > 0 ? (
            <div className="dash-motivation">
              <p className="dash-hint">
                💪 Wczoraj: <strong>{yesterday.sessions} sesji</strong> i <strong>{yesterday.minutes} min</strong>
              </p>
              {sessionsToday.totalDocs >= yesterday.sessions ? (
                <p className="dash-success">✨ Świetnie! Dzisiaj pobij swój rekord!</p>
              ) : (
                <p className="dash-challenge">🎯 Zrób dziś więcej niż wczoraj!</p>
              )}
            </div>
          ) : (
            <p className="dash-hint">Wczoraj nie było sesji. Zrób dzisiaj sesję i zacznij swoją serię!</p>
          )}
          <Link href="/calendar" className="dash-link-inline">Przejdź do pełnego kalendarza</Link>
        </div>

        <div className="dash-card-box">
          <h3 className="dash-card-title"><BookOpen size={18} /> Rozpocznij</h3>
          <div className="dash-actions">
            <Link href="/study" className="dash-action-btn">Ucz się</Link>
            <Link href="/create" className="dash-action-btn dash-action-btn--ghost">Kreator zestawów</Link>
          </div>

          <div className="dash-materials">
            <p className="dash-materials-title">Twoje materiały</p>
            {folders.docs.slice(0, 3).map((folder: any) => (
              <Link key={`f-${folder.id}`} href={`/folders/${folder.id}`} className="dash-material-row">
                <span><FolderOpen size={15} /></span>
                <span>{folder.name}</span>
              </Link>
            ))}
            {decks.docs.slice(0, 5).map((deck: any) => (
              <Link key={`d-${deck.id}`} href={`/decks/${deck.id}`} className="dash-material-row">
                <span><BookOpen size={15} /></span>
                <span>{deck.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
