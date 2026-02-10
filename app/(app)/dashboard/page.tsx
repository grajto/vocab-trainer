/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, ChevronRight, EllipsisVertical, Sparkles } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'

export const dynamic = 'force-dynamic'

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function modeLabel(mode: string) {
  if (mode === 'abcd') return 'Test wyboru'
  if (mode === 'translate') return 'Tłumaczenie'
  return mode
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
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id }, startedAt: { greater_than_equal: todayStart.toISOString() } }, limit: 100, depth: 0 }),
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id } }, sort: '-startedAt', limit: 30, depth: 0 }),
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id }, startedAt: { greater_than_equal: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString() } }, sort: '-startedAt', limit: 0, depth: 0 }),
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
    const key = getDayKey(start)
    const existing = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    existing.sessions += 1
    existing.minutes += Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
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
  const recentDecks: Array<{ deckId: string; name: string; lastUsed: string; cardCount: number }> = []

  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    const deck = deckMap.get(did)
    if (!deck) continue

    if (!recentDeckIds.has(did)) {
      recentDeckIds.add(did)
      recentDecks.push({ deckId: did, name: deck.name, lastUsed: s.startedAt, cardCount: Number(deck.cardCount || 0) })
    }

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
  }

  const recents = recentDecks.slice(0, 6)
  const popular = decks.docs.slice(0, 3)

  return (
    <div className="max-w-4xl px-4 py-6 lg:px-8 lg:py-8 space-y-10">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[30px] tracking-tight font-semibold text-slate-900">Witaj ponownie</h2>
          <Link href="/stats" className="text-sm text-indigo-600 hover:text-indigo-500">Statystyki dnia</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Sesje dzisiaj</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{sessionsToday.totalDocs}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Czas nauki</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{timeTodayMinutes} min</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-xs text-slate-500">Seria</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{streakDays} dni</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-slate-900">Jump back in</h3>
        {jumpBackIn.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 text-center">Brak przerwanych sesji.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {jumpBackIn.slice(0, 2).map(item => (
              <article key={item.sessionId} className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-[0_1px_0_rgba(15,23,42,.04)]">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-xl font-semibold text-slate-900 line-clamp-1">{item.name}</h4>
                  <EllipsisVertical className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-3 h-3 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.progressRatio}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.progressRatio}% completed · {modeLabel(item.mode)}</p>
                <div className="mt-4 flex items-center justify-between">
                  <Link href={`/session/${item.sessionId}`} className="inline-flex items-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Continue</Link>
                  <span className="text-xs text-slate-500">{item.progress}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-2xl font-semibold text-slate-900">Recents</h3>
        {recents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-sm text-slate-500 text-center">Nie masz jeszcze ostatnich zestawów.</div>
        ) : (
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {recents.map(deck => (
              <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="group flex items-start gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-100">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-indigo-600">{deck.name}</p>
                  <p className="text-sm text-slate-500">{deck.cardCount} cards · {new Date(deck.lastUsed).toLocaleDateString('pl-PL')}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Personalize your content</h3>
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Sparkles className="h-6 w-6" />
            </div>
            <EllipsisVertical className="w-4 h-4 text-slate-400" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-slate-900">Dodaj swoje egzaminy, aby uzyskać rekomendowane treści</p>
          <Link href="/library" className="mt-4 inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Dodaj cele nauki</Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-semibold text-slate-900">Popular with other learners</h3>
          <Link href="/decks" className="text-sm text-indigo-600 hover:text-indigo-500">Zobacz więcej</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {popular.map((deck: any) => (
            <Link key={deck.id} href={`/decks/${deck.id}`} className="rounded-3xl border border-slate-200 bg-white px-4 py-4 hover:border-indigo-200 hover:bg-indigo-50/20">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="mt-4 line-clamp-2 text-base font-semibold text-slate-900">{deck.name}</p>
              <p className="mt-1 text-sm text-slate-500">{deck.cardCount || 0} cards · by you</p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600">Otwórz <ChevronRight className="w-4 h-4" /></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-900">Twoje zasoby</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {folders.docs.slice(0, 4).map((folder: any) => (
            <Link key={`folder-${folder.id}`} href={`/folders/${folder.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">📁 {folder.name}</Link>
          ))}
          {decks.docs.slice(0, 4).map((deck: any) => (
            <Link key={`deck-${deck.id}`} href={`/decks/${deck.id}`} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">📘 {deck.name}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}
