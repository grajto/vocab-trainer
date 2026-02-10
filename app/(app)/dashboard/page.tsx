/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BarChart3, BookOpen, FolderOpen, Sparkles, Target } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { type ContinueItem } from './_components/ContinueCard'
import { JumpBackInCarousel } from './_components/JumpBackInCarousel'
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
        progressMeta: `${progressPercent}% of questions completed`,
        resumeHref: `/session/${s.id}`,
        date: new Date(s.startedAt).toLocaleDateString('pl-PL'),
      })
    }

    recentDeckIds.add(String(s.deck))
  }

  const problematic = [...jumpBackIn].sort((a, b) => a.progressPercent - b.progressPercent).slice(0, 3)

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
  const avgMinutes = sessionsToday.totalDocs > 0 ? Math.round(timeTodayMinutes / sessionsToday.totalDocs) : 0

  const last5Days = [4, 3, 2, 1, 0].map((offset) => {
    const d = new Date(now)
    d.setDate(now.getDate() - offset)
    const stats = sessionsByDay.get(getDayKey(d)) ?? { sessions: 0, minutes: 0 }
    return {
      label: d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' }),
      sessions: stats.sessions,
      minutes: stats.minutes,
      met: isDailyGoalMet(settings, stats.sessions, stats.minutes),
    }
  })

  const sectionLabelClass = 'text-[.875rem] leading-[1.4285714286] font-semibold tracking-normal text-slate-900'

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-8 px-4 lg:px-6">
      <section className="space-y-4">
        <div>
          <h2 className={`mb-3 text-base ${sectionLabelClass}`}>Informacje</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Liczba sesji dzisiaj" value={`${sessionsToday.totalDocs}`} />
            <StatCard label="Czas trenowania słówek" value={`${timeTodayMinutes} min`} />
            <StatCard label="Seria dni" value={`${streakDays} dni`} />
          </div>
        </div>

        <SimpleCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4255ff]">
              <Sparkles size={16} />
              Co powtórzyć dziś
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">Tryb: tłumaczenie</span>
          </div>

          <p className="mt-3 text-sm font-medium text-slate-700">{recommendation}</p>

          <div className="mt-4 h-2 w-full rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-[#4255ff]" style={{ width: `${todayProgress}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-slate-500">Pozostało <strong>{remainingToGoal}</strong> sesji do dzisiejszego celu.</p>
            <Link href="/study" className="inline-flex min-h-10 items-center rounded-full bg-[#eef1ff] px-4 text-sm font-semibold text-[#4255ff] hover:bg-[#e4e9ff]">
              Rozpocznij sesję
            </Link>
          </div>
        </SimpleCard>
      </section>

      <section className="space-y-3">
        <h2 className={sectionLabelClass}>Jump back in</h2>

        {jumpBackIn.length === 0 ? (
          <SimpleCard className="p-4">
            <p className="text-sm text-slate-500">Brak przerwanych sesji.</p>
          </SimpleCard>
        ) : (
          <JumpBackInCarousel items={jumpBackIn} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className={sectionLabelClass}>Recents</h2>

        {recents.length === 0 ? (
          <SimpleCard className="p-4">
            <p className="text-sm text-slate-500">Brak ostatnich materiałów.</p>
          </SimpleCard>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {recents.map((item, idx) => (
              <RecentItem
                key={`${item.type}-${item.id}`}
                href={item.type === 'deck' ? `/decks/${item.id}` : `/folders/${item.id}`}
                title={item.name}
                meta={item.meta}
                type={item.type}
                highlighted={idx === 0}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <SimpleCard className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <BarChart3 size={18} />
            Twoja aktywność
          </h3>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Sesje dziś</p>
              <p className="text-lg font-semibold text-slate-900">{sessionsToday.totalDocs}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Śr. czas / sesję</p>
              <p className="text-lg font-semibold text-slate-900">{avgMinutes} min</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Seria</p>
              <p className="text-lg font-semibold text-slate-900">{streakDays} dni</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-5 gap-2">
            {last5Days.map((day) => (
              <div key={day.label} className={`rounded-lg p-2 text-center ${day.met ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                <p className="text-[11px] text-slate-500">{day.label}</p>
                <p className="mt-1 text-xs font-semibold text-slate-800">{day.sessions}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Najbardziej problematyczne zestawy</p>
            <div className="space-y-1">
              {problematic.length === 0 ? (
                <p className="text-sm text-slate-500">Brak danych o problematycznych zestawach.</p>
              ) : (
                problematic.map((item) => (
                  <p key={item.resumeHref} className="text-sm text-slate-700">• {item.deckName} — {item.progressMeta}</p>
                ))
              )}
            </div>
          </div>
        </SimpleCard>

        <SimpleCard className="p-5">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
            <Target size={18} />
            Rozpocznij
          </h3>

          <p className="mb-4 text-sm text-slate-600">Uruchom naukę jednym kliknięciem albo przejdź do tworzenia nowych zestawów.</p>

          <div className="space-y-2">
            <Link href="/study" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#eef1ff] px-4 text-sm font-semibold text-[#4255ff] hover:bg-[#e4e9ff]">
              Ucz się
              <ArrowRight size={15} />
            </Link>
            <Link href="/create" className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Kreator zestawów
            </Link>
          </div>

          <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Szybki dostęp</p>
            <div className="space-y-1">
              {folders.docs.slice(0, 2).map((folder: any) => (
                <Link key={`f-${folder.id}`} href={`/folders/${folder.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-slate-50">
                  <FolderOpen size={14} />
                  <span className="truncate">{folder.name}</span>
                </Link>
              ))}
              {decks.docs.slice(0, 2).map((deck: any) => (
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
