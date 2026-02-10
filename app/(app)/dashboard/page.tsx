/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { BookOpen, CalendarCheck, Clock, Flame, FolderOpen, PlayCircle } from 'lucide-react'
import { JumpBackInList } from './JumpBackInList'

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
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id }, startedAt: { greater_than_equal: todayStart.toISOString() } },
        limit: 100,
        depth: 0,
      }),
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id } }, sort: '-startedAt', limit: 30, depth: 0 }),
      payload.find({
        collection: 'sessions',
        where: {
          owner: { equals: user.id },
          startedAt: {
            greater_than_equal: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(),
          },
        },
        sort: '-startedAt',
        limit: 0,
        depth: 0,
      }),
    ])

    sessionsToday = results[0]
    decks = results[1]
    folders = results[2]
    recentSessions = results[3]
    allSessionsYear = results[4]
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
    const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
    const key = getDayKey(start)
    const existing = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    existing.sessions += 1
    existing.minutes += minutes
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
    } else {
      break
    }
  }

  const deckMap = new Map<string, any>(decks.docs.map((d: any) => [String(d.id), d]))
  const folderMap = new Map<string, any>(folders.docs.map((f: any) => [String(f.id), f]))
  const recentDeckIds = new Set<string>()
  const jumpBackIn: Array<{ deckId: string; name: string; mode: string; sessionId: string; progress: string; startedAt: string; progressPercent: number }> = []
  const recentDecks: Array<{ deckId: string; name: string; lastUsed: string; cardCount: number }> = []

  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    const deck = deckMap.get(did)
    if (!deck) continue

    if (!recentDeckIds.has(did)) {
      recentDeckIds.add(did)
      recentDecks.push({
        deckId: did,
        name: deck.name,
        lastUsed: s.startedAt,
        cardCount: Number(deck.cardCount || 0),
      })
    }

    const completed = Number(s.completedCount ?? 0)
    const target = Number(s.targetCount ?? 0)
    if ((s.endedAt === null || completed < target) && !jumpBackIn.find(item => item.sessionId === String(s.id))) {
      jumpBackIn.push({
        deckId: did,
        name: deck.name,
        mode: s.mode || 'translate',
        sessionId: String(s.id),
        progress: `${completed}/${target}`,
        startedAt: s.startedAt,
        progressPercent: target > 0 ? Math.round((completed / target) * 100) : 0,
      })
    }
  }

  const recommendation = [
    `Minimum dzienne: ${settings.minSessionsPerDay} sesji lub ${settings.minMinutesPerDay} min.`,
    `Rekomendacja: dokończ ${Math.max(0, settings.minSessionsPerDay - sessionsToday.totalDocs)} sesje w trybie mieszanym.`,
    `Następnie zrób 1 krótką powtórkę w trybie ${settings.mixSentence >= settings.mixAbcd ? 'sentence' : 'abcd'}.`,
  ]

  const recentThreeDays = [2, 1, 0].map(offset => {
    const day = new Date(now)
    day.setDate(now.getDate() - offset)
    const stats = sessionsByDay.get(getDayKey(day)) ?? { sessions: 0, minutes: 0 }
    return { day, ...stats }
  })

  const yesterdayStats = recentThreeDays[1]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Najważniejsze informacje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Liczba sesji dzisiaj</span>
              <CalendarCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-3xl font-semibold mt-2">{sessionsToday.totalDocs}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Czas nauki dzisiaj</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-3xl font-semibold mt-2">{timeTodayMinutes} min</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Seria dni</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-3xl font-semibold mt-2">{streakDays}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-xs text-slate-500 mb-2">Co powinieneś zrobić</p>
            <ul className="space-y-1 text-xs text-slate-700 list-disc ml-4">
              {recommendation.map(item => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Jump back in</h2>
          <Link href="/study" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Nowa sesja →</Link>
        </div>
        <JumpBackInList initialItems={jumpBackIn} />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">Recents</h2>
        {recentDecks.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl px-6 py-8 text-center text-sm text-slate-400">
            Brak ostatnich zasobów.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {recentDecks.slice(0, 6).map(deck => (
              <Link key={deck.deckId} href={`/decks/${deck.deckId}`} className="bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-indigo-300">
                <p className="font-medium text-slate-900">📘 {deck.name}</p>
                <p className="text-xs text-slate-500 mt-1">{deck.cardCount || 0} słówek · {new Date(deck.lastUsed).toLocaleDateString('pl-PL')}</p>
              </Link>
            ))}
            {Array.from(folderMap.values()).slice(0, 2).map((folder: any) => (
              <Link key={folder.id} href={`/folders/${folder.id}`} className="bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-indigo-300">
                <p className="font-medium text-slate-900">📁 {folder.name}</p>
                <p className="text-xs text-slate-500 mt-1">Folder</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Mini kalendarz aktywności</h3>
          <div className="grid grid-cols-3 gap-2">
            {recentThreeDays.map(item => {
              const met = isDailyGoalMet(settings, item.sessions, item.minutes)
              const base = item.sessions === 0
                ? 'bg-slate-100 text-slate-500'
                : met
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              return (
                <div key={item.day.toISOString()} className={`rounded-xl px-3 py-3 ${base}`}>
                  <p className="text-xs font-semibold capitalize">{item.day.toLocaleDateString('pl-PL', { weekday: 'short' })}</p>
                  <p className="text-xs mt-1">{item.sessions} sesji</p>
                </div>
              )
            })}
          </div>
          <p className="text-sm text-slate-600 mt-4">
            Wczoraj zrobiłeś {yesterdayStats.sessions} sesji i {yesterdayStats.minutes} min nauki.
          </p>
        </div>

        <div className="space-y-3">
          <Link href="/study" className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white text-center py-4 rounded-2xl font-semibold hover:bg-indigo-700">
            <PlayCircle className="w-5 h-5" />
            Rozpocznij sesję
          </Link>
          <Link href="/library" className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-700 text-center py-4 rounded-2xl font-medium hover:border-indigo-300">
            <BookOpen className="w-5 h-5" />
            Wszystkie materiały
          </Link>
          <Link href="/folders" className="flex items-center justify-center gap-2 w-full bg-white border border-slate-200 text-slate-700 text-center py-4 rounded-2xl font-medium hover:border-indigo-300">
            <FolderOpen className="w-5 h-5" />
            Przejdź do folderów
          </Link>
        </div>
      </section>
    </div>
  )
}
