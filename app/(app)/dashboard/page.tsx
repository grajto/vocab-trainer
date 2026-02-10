/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, CalendarClock, FolderOpen, Sparkles } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { ContinueCard, type ContinueItem } from './_components/ContinueCard'
import { RecentItem } from './_components/RecentItem'
import { SimpleCard } from './_components/SimpleCard'
import { StatCard } from './_components/StatCard'

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
        where: {
          owner: { equals: user.id },
          startedAt: { greater_than_equal: todayStart.toISOString() },
          endedAt: { not_equals: null },
        },
        limit: 100,
        depth: 0,
      }),
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, sort: '-updatedAt', limit: 200, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, sort: '-updatedAt', limit: 200, depth: 0 }),
      payload.find({ collection: 'sessions', where: { owner: { equals: user.id } }, sort: '-startedAt', limit: 30, depth: 0 }),
      payload.find({
        collection: 'sessions',
        where: {
          owner: { equals: user.id },
          startedAt: { greater_than_equal: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString() },
          endedAt: { not_equals: null },
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
    console.error('Dashboard data fetch error:', err)
  }

  const settings = getStudySettings(user as Record<string, unknown>)

  const timeTodayMinutes = sessionsToday.docs.reduce((sum: number, s: any) => {
    if (!s.startedAt || !s.endedAt) return sum
    const start = new Date(s.startedAt)
    const end = new Date(s.endedAt)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return sum + Math.max(0, minutes)
  }, 0)

  const sessionsByDay = new Map<string, { sessions: number; minutes: number }>()
  for (const s of allSessionsYear.docs) {
    if (!s.startedAt || !s.endedAt) continue
    const start = new Date(s.startedAt)
    const end = new Date(s.endedAt)
    const key = getDayKey(start)
    const existing = sessionsByDay.get(key) ?? { sessions: 0, minutes: 0 }
    existing.sessions += 1
    existing.minutes += Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
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

  const jumpBackIn: ContinueItem[] = []
  const recentDeckIds = new Set<string>()

  for (const s of recentSessions.docs) {
    const deck = deckMap.get(String(s.deck))
    if (!deck) continue

    const completed = Number(s.completedCount ?? 0)
    const target = Number(s.targetCount ?? 0)
    const progressPercent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0

    if ((s.endedAt === null || completed < target) && !jumpBackIn.find((item) => item.resumeHref.endsWith(String(s.id)))) {
      jumpBackIn.push({
        deckName: deck.name,
        progressPercent,
        progressMeta: `${progressPercent}% ukończone • ${s.mode || 'translate'} • ${completed}/${target}`,
        resumeHref: `/session/${s.id}`,
        date: new Date(s.startedAt).toLocaleDateString('pl-PL'),
      })
    }

    recentDeckIds.add(String(s.deck))
  }

  const recents = [
    ...decks.docs
      .filter((d: any) => recentDeckIds.has(String(d.id)))
      .slice(0, 6)
      .map((d: any) => ({
        type: 'deck' as const,
        id: String(d.id),
        name: d.name,
        meta: `${Number(d.cardCount || 0)} słówek`,
      })),
    ...folders.docs.slice(0, 4).map((f: any) => {
      const count = decks.docs.filter((d: any) => String(d.folder) === String(f.id)).length
      return {
        type: 'folder' as const,
        id: String(f.id),
        name: f.name,
        meta: `${count} zestawów`,
      }
    }),
  ].slice(0, 8)

  const recommendation = jumpBackIn.length > 0
    ? `Do dokończenia masz ${jumpBackIn.length} sesji — zacznij od „${jumpBackIn[0].deckName}”.`
    : `Masz ${decks.docs.length} zestawów. Zaplanuj minimum ${Math.max(1, settings.minSessionsPerDay)} sesję.`

  const remainingToGoal = Math.max(0, Math.max(1, settings.minSessionsPerDay) - sessionsToday.totalDocs)
  const todayProgress = Math.min(100, Math.round((sessionsToday.totalDocs / Math.max(1, settings.minSessionsPerDay)) * 100))

  const last3Days = [2, 1, 0].map((offset) => {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    const stats = sessionsByDay.get(getDayKey(d)) ?? { sessions: 0, minutes: 0 }
    return {
      label: d.toLocaleDateString('pl-PL', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      sessions: stats.sessions,
      minutes: stats.minutes,
      met: isDailyGoalMet(settings, stats.sessions, stats.minutes),
    }
  })

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-8">
      <section className="space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Strona główna</h1>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Liczba sesji dzisiaj" value={`${sessionsToday.totalDocs}`} />
          <StatCard label="Czas trenowania słówek" value={`${timeTodayMinutes} min`} />
          <StatCard label="Seria dni" value={`${streakDays} dni`} />
        </div>

        <SimpleCard className="overflow-hidden p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3 border-b border-slate-100 p-5 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-500">
                <Sparkles size={14} />
                Co powtórzyć dziś
              </div>
              <p className="text-sm font-medium text-slate-700">{recommendation}</p>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">Postęp celu dziennego</p>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-orange-400" style={{ width: `${todayProgress}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">Pozostało <strong>{remainingToGoal}</strong> sesji do dzisiejszego celu.</p>
              </div>
            </div>

            <div className="flex flex-col justify-between gap-4 p-5">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">Tryb: tłumaczenie</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-600">Limit: {Math.max(1, settings.minSessionsPerDay)} sesji</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/study" className="inline-flex min-h-10 items-center rounded-full bg-orange-400 px-4 text-sm font-semibold text-white hover:bg-orange-500">
                  Rozpocznij sesję
                </Link>
                {jumpBackIn[0] ? (
                  <Link href={jumpBackIn[0].resumeHref} className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Wznów ostatnią
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </SimpleCard>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Jump back in</h2>
          <Link href="/study" className="text-sm font-semibold text-orange-500 hover:text-orange-600">Nowa sesja →</Link>
        </div>

        {jumpBackIn.length === 0 ? (
          <SimpleCard>
            <p className="text-sm text-slate-500">Brak przerwanych sesji.</p>
          </SimpleCard>
        ) : (
          <div className="relative">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {jumpBackIn.slice(0, 6).map((item) => (
                <div key={item.resumeHref} className="min-w-[82%] snap-start lg:min-w-[64%]">
                  <ContinueCard item={item} />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-white to-transparent" />
            <div className="mt-1 flex items-center justify-center gap-1.5">
              {jumpBackIn.slice(0, 6).map((item, idx) => (
                <span key={item.resumeHref} className={`h-1.5 w-1.5 rounded-full ${idx === 0 ? 'bg-orange-400' : 'bg-slate-300'}`} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recents</h2>

        {recents.length === 0 ? (
          <SimpleCard>
            <p className="text-sm text-slate-500">Brak ostatnich materiałów.</p>
          </SimpleCard>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {recents.map((item) => (
              <RecentItem
                key={`${item.type}-${item.id}`}
                href={item.type === 'deck' ? `/decks/${item.id}` : `/folders/${item.id}`}
                title={item.name}
                meta={item.meta}
                type={item.type}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SimpleCard>
          <h3 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <CalendarClock size={18} />
            Twoja aktywność
          </h3>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Dziś</p>
              <p className="text-lg font-semibold text-slate-800">{sessionsToday.totalDocs} sesji</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Czas</p>
              <p className="text-lg font-semibold text-slate-800">{timeTodayMinutes} min</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Seria</p>
              <p className="text-lg font-semibold text-slate-800">{streakDays} dni</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {last3Days.map((day) => (
              <div
                key={day.label}
                className={`rounded-xl border p-2 ${day.sessions === 0 ? 'border-slate-200 bg-slate-50' : day.met ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
              >
                <p className="text-xs text-slate-500">{day.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">{day.sessions} sesji</p>
                <p className="text-xs text-slate-500">{day.minutes} min</p>
              </div>
            ))}
          </div>
        </SimpleCard>

        <SimpleCard>
          <h3 className="mb-3 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <BookOpen size={18} />
            Rozpocznij
          </h3>

          <p className="mb-4 text-sm text-slate-600">Szybki start nauki i przejście do narzędzi tworzenia materiałów.</p>

          <div className="space-y-2">
            <Link href="/study" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 text-sm font-semibold text-white hover:bg-orange-500">
              Ucz się
              <ArrowRight size={15} />
            </Link>
            <Link href="/create" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Kreator zestawów
            </Link>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Twoje materiały</p>
            <div className="space-y-1">
              {folders.docs.slice(0, 3).map((folder: any) => (
                <Link key={`f-${folder.id}`} href={`/folders/${folder.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                  <FolderOpen size={14} />
                  <span className="truncate">{folder.name}</span>
                </Link>
              ))}
              {decks.docs.slice(0, 3).map((deck: any) => (
                <Link key={`d-${deck.id}`} href={`/decks/${deck.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                  <BookOpen size={14} />
                  <span className="truncate">{deck.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </SimpleCard>
      </section>
    </div>
  )
}
