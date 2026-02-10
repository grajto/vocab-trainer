import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { BookOpen, CalendarCheck, Clock, Flame, PlayCircle, RotateCcw } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sessionsToday: any = { totalDocs: 0, docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decks: any = { totalDocs: 0, docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentSessions: any = { docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allSessionsYear: any = { docs: [] }

  try {
    const results = await Promise.all([
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id }, startedAt: { greater_than_equal: todayStart.toISOString() } },
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        limit: 200,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id } },
        sort: '-startedAt',
        limit: 24,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id }, startedAt: { greater_than_equal: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString() } },
        sort: '-startedAt',
        limit: 0,
        depth: 0,
      }),
    ])
    sessionsToday = results[0]
    decks = results[1]
    recentSessions = results[2]
    allSessionsYear = results[3]
  } catch (err) {
    console.error('Dashboard data fetch error (migration may be pending):', err)
  }

  const settings = getStudySettings(user as Record<string, unknown>)
  const timeTodayMinutes = sessionsToday.docs.reduce((sum: number, s: any) => {
    if (!s.startedAt) return sum
    const start = new Date(s.startedAt)
    const end = s.endedAt ? new Date(s.endedAt) : now
    return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  }, 0)

  const sessionsByDay = new Map<string, { sessions: number; minutes: number }>()
  for (const s of allSessionsYear.docs) {
    if (!s.startedAt) continue
    const start = new Date(s.startedAt)
    const end = s.endedAt ? new Date(s.endedAt) : now
    const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
    const existing = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    existing.sessions += 1
    existing.minutes += minutes
    sessionsByDay.set(key, existing)
  }

  let streakDays = 0
  const checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)
  for (let i = 0; i < 365; i++) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
    const dayStats = sessionsByDay.get(key)
    if (dayStats && isDailyGoalMet(settings, dayStats.sessions, dayStats.minutes)) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  const deckMap = new Map<string, any>(decks.docs.map((d: any) => [String(d.id), d]))
  const recentDeckIds = new Set<string>()
  const jumpBackIn: Array<{ deckId: string; name: string; mode: string; sessionId: string; progress: string; startedAt: string }> = []
  const recentDecks: Array<{ deckId: string; name: string; lastUsed: string }> = []

  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    if (recentDeckIds.has(did)) continue
    recentDeckIds.add(did)
    const deck = deckMap.get(did)
    if (deck) {
      if (s.endedAt === null || (s.completedCount ?? 0) < (s.targetCount ?? 0)) {
        jumpBackIn.push({
          deckId: did,
          name: deck.name,
          mode: s.mode || 'translate',
          sessionId: String(s.id),
          progress: `${s.completedCount ?? 0}/${s.targetCount ?? 0}`,
          startedAt: s.startedAt,
        })
      }
      recentDecks.push({
        deckId: did,
        name: deck.name,
        lastUsed: s.startedAt,
      })
    }
  }

  const recentDeckIdsList = recentDecks.slice(0, 6).map(r => r.deckId)
  let recentDeckStats: Record<string, { cardCount: number; mastery: number }> = {}
  if (recentDeckIdsList.length > 0) {
    const cards = await payload.find({
      collection: 'cards',
      where: { owner: { equals: user.id }, deck: { in: recentDeckIdsList } },
      limit: 1000,
      depth: 0,
    })
    const cardsByDeck = new Map<string, string[]>()
    for (const card of cards.docs) {
      const did = String(card.deck)
      if (!cardsByDeck.has(did)) cardsByDeck.set(did, [])
      cardsByDeck.get(did)!.push(String(card.id))
    }

    const reviewStates = cards.docs.length > 0 ? await payload.find({
      collection: 'review-states',
      where: { owner: { equals: user.id }, card: { in: cards.docs.map((c: any) => c.id) } },
      limit: 1000,
      depth: 0,
    }) : { docs: [] }

    const level4ByDeck = new Map<string, number>()
    const totalByDeck = new Map<string, number>()
    for (const rs of reviewStates.docs) {
      const cardId = String(rs.card)
      const deckId = cards.docs.find((c: any) => String(c.id) === cardId)?.deck
      if (!deckId) continue
      const did = String(deckId)
      totalByDeck.set(did, (totalByDeck.get(did) || 0) + 1)
      if (rs.level === 4) {
        level4ByDeck.set(did, (level4ByDeck.get(did) || 0) + 1)
      }
    }

    recentDeckStats = Object.fromEntries(recentDeckIdsList.map(did => {
      const total = totalByDeck.get(did) || 0
      const l4 = level4ByDeck.get(did) || 0
      return [did, {
        cardCount: cardsByDeck.get(did)?.length || 0,
        mastery: total > 0 ? Math.round((l4 / total) * 100) : 0,
      }]
    }))
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto space-y-10">
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Informacje dzisiaj</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href="/stats" prefetch={true} className="group bg-white border border-slate-100 rounded-3xl px-6 py-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">Sesje dzisiaj</span>
              <CalendarCheck className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-semibold text-slate-900 tabular-nums">{sessionsToday.totalDocs}</p>
            <p className="text-xs text-slate-400 mt-2">Kliknij, aby zobaczyć statystyki</p>
          </Link>
          <Link href="/stats" prefetch={true} className="group bg-white border border-slate-100 rounded-3xl px-6 py-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">Czas dzisiaj</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-semibold text-slate-900 tabular-nums">{timeTodayMinutes} min</p>
            <p className="text-xs text-slate-400 mt-2">Zobacz historię sesji</p>
          </Link>
          <Link href="/calendar" prefetch={true} className="group bg-white border border-slate-100 rounded-3xl px-6 py-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400">Seria</span>
              <Flame className="w-5 h-5 text-rose-500" />
            </div>
            <p className="text-3xl font-semibold text-slate-900 tabular-nums">{streakDays} dni</p>
            <p className="text-xs text-slate-400 mt-2">Kliknij, aby zobaczyć kalendarz</p>
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Jump back in</h2>
          <Link href="/study" prefetch={true} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Nowa sesja →
          </Link>
        </div>
        {jumpBackIn.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl px-6 py-8 text-center text-sm text-slate-400">
            Brak przerwanych sesji. Zacznij nową naukę.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {jumpBackIn.slice(0, 6).map(item => (
              <div key={item.sessionId} className="bg-white border border-slate-100 rounded-3xl px-6 py-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <span className="text-xs text-slate-400 capitalize">{item.mode}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Postęp: {item.progress}</p>
                <p className="text-xs text-slate-400 mt-1">Ostatnio: {new Date(item.startedAt).toLocaleString('pl-PL')}</p>
                <Link
                  href={`/session/${item.sessionId}`}
                  prefetch={true}
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-2.5 rounded-2xl hover:from-blue-700 hover:to-violet-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PlayCircle className="w-4 h-4" />
                  Kontynuuj
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Ostatnie</h2>
        {recentDecks.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl px-6 py-8 text-center text-sm text-slate-400">
            Brak ostatnich sesji. Zacznij naukę, aby zobaczyć statystyki.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentDecks.slice(0, 6).map(deck => {
              const stats = recentDeckStats[deck.deckId] || { cardCount: 0, mastery: 0 }
              return (
                <Link
                  key={deck.deckId}
                  href={`/decks/${deck.deckId}`}
                  prefetch={true}
                  className="bg-white border border-slate-100 rounded-3xl px-6 py-6 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
                >
                  <p className="font-medium text-slate-900">{deck.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{stats.cardCount} kart</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: `${stats.mastery}%` }} />
                    </div>
                    <span className="text-xs text-slate-500">{stats.mastery}% L4</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Ostatnio użyte: {new Date(deck.lastUsed).toLocaleDateString('pl-PL')}</p>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <Link
          href="/study"
          prefetch={true}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white text-center py-5 rounded-2xl font-semibold hover:from-blue-700 hover:to-violet-700 transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <BookOpen className="w-5 h-5" />
          Rozpocznij naukę
        </Link>
      </section>

      <section className="flex justify-center">
        <Link href="/decks" prefetch={true} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600">
          <RotateCcw className="w-4 h-4" />
          Zobacz wszystkie zasoby
        </Link>
      </section>
    </div>
  )
}
