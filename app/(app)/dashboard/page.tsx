/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BarChart3, BookOpen, Clock, Flame, FolderOpen } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { IconSquare } from '../_components/ui/IconSquare'
import { Card } from '../_components/ui/Card'
import { type ContinueItem } from './_components/ContinueCard'
import { JumpBackInCarousel } from './_components/JumpBackInCarousel'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'
import { ProgressBar } from '../_components/ui/ProgressBar'

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
  let cards: any = { docs: [] }

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
        limit: 5000,
        depth: 0,
      }),
      payload.find({ collection: 'cards', where: { owner: { equals: user.id } }, limit: 5000, depth: 0 }),
    ])

    sessionsToday = results[0]
    decks = results[1]
    folders = results[2]
    recentSessions = results[3]
    allSessionsYear = results[4]
    cards = results[5]
  } catch (err) {
    console.error('Dashboard data fetch error:', err)
  }

  // Count cards per deck
  const cardsByDeck = new Map<string, number>()
  for (const card of cards.docs) {
    const deckId = String(card.deck)
    cardsByDeck.set(deckId, (cardsByDeck.get(deckId) || 0) + 1)
  }

  // Add cardCount to each deck
  for (const deck of decks.docs) {
    deck.cardCount = cardsByDeck.get(String(deck.id)) || 0
  }

  const settings = getStudySettings(user as unknown as Record<string, unknown>)

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
  const deckRecentMeta = new Map<string, { avgMinutes: number; mode: string; targetCount: number; direction: string; sessions: number }>()

  for (const s of recentSessions.docs) {
    const deck = deckMap.get(String(s.deck))
    if (!deck) continue

    const completed = Number(s.completedCount ?? 0)
    const target = Number(s.targetCount ?? 20)
    const progressPercent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0

    const startedAt = s.startedAt ? new Date(s.startedAt) : null
    const endedAt = s.endedAt ? new Date(s.endedAt) : null
    const minutes = startedAt && endedAt ? Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)) : Math.max(3, Math.round(target * 0.4))
    const existingMeta = deckRecentMeta.get(String(s.deck))
    if (!existingMeta) {
      deckRecentMeta.set(String(s.deck), {
        avgMinutes: minutes,
        mode: String(s.mode || 'mixed'),
        targetCount: target,
        direction: String(s.direction || settings.defaultDirection),
        sessions: 1,
      })
    } else {
      existingMeta.sessions += 1
      existingMeta.avgMinutes = Math.round((existingMeta.avgMinutes + minutes) / 2)
      if (s.mode) existingMeta.mode = String(s.mode)
      if (s.targetCount) existingMeta.targetCount = Number(s.targetCount)
      if (s.direction) existingMeta.direction = String(s.direction)
    }

    if ((s.endedAt === null || completed < target) && !jumpBackIn.find((item) => item.resumeHref.endsWith(String(s.id)))) {
      jumpBackIn.push({
        sessionId: String(s.id),
        deckId: String(deck.id),
        deckName: deck.name,
        progressPercent,
        progressMeta: `${progressPercent}% pytań ukończone`,
        resumeHref: `/session/${s.id}`,
        date: new Date(s.startedAt).toLocaleDateString('pl-PL'),
        mode: String(s.mode || 'mixed'),
        targetCount: target,
        direction: String(s.direction || settings.defaultDirection),
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
  ].slice(0, 6)

  const sessionsGoal = Math.max(1, settings.minSessionsPerDay)
  const minutesGoal = Math.max(1, settings.minMinutesPerDay)
  const remainingSessions = Math.max(0, sessionsGoal - sessionsToday.totalDocs)
  const remainingMinutes = Math.max(0, minutesGoal - timeTodayMinutes)
  const sessionsProgress = Math.min(100, Math.round((sessionsToday.totalDocs / sessionsGoal) * 100))
  const minutesProgress = Math.min(100, Math.round((timeTodayMinutes / minutesGoal) * 100))

  return (
    <PageContainer className="space-y-6 px-4 py-2 lg:px-0">
      <PageHeader title="Dashboard" description="Szybki podgląd Twojej nauki" icon={BarChart3} />
      {/* Section A - Informacje (unified analytical card) */}
      <section>
        <h2 className="section-heading mb-3 text-lg" style={{ color: 'var(--text)', fontWeight: 700 }}>Informacje</h2>
          <Card>
            {/* A1: Three compact stats */}
            <div className="grid grid-cols-3 gap-4 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
              {[
                { label: 'Sesje dzisiaj', value: sessionsToday.totalDocs, icon: BarChart3 },
                { label: 'Czas dzisiaj', value: `${timeTodayMinutes} min`, icon: Clock },
                { label: 'Seria', value: `${streakDays} dni`, icon: Flame },
              ].map((item, idx) => {
                const Icon = item.icon
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <IconSquare variant="primary" size={36}>
                      <Icon size={16} />
                    </IconSquare>
                    <div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</p>
                      <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{item.value}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* A2: Goal + progress */}
            <div className="py-5" style={{ borderColor: 'var(--border)' }}>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sesje dziennie: {sessionsGoal}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pozostało: {remainingSessions}</p>
                  </div>
                  <ProgressBar value={sessionsProgress} className="h-3" />
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Do końca celu brakuje: {remainingSessions} sesji</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Minuty dziennie: {minutesGoal}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pozostało: {remainingMinutes}</p>
                  </div>
                  <ProgressBar value={minutesProgress} className="h-3" />
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Do końca celu brakuje: {remainingMinutes} min</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

      {/* Section - Co powtórzyć dziś (removed as requested) */}

      {/* Section B - Recents */}
      <section>
        <h2 className="section-heading mb-3 text-lg" style={{ color: 'var(--text)', fontWeight: 700 }}>Recents</h2>
        {recents.length === 0 ? (
          <Card compact>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Brak ostatnich materiałów.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recents.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.type === 'deck' ? `/decks/${item.id}` : `/folders/${item.id}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--hover-bg)] transition-colors"
                style={{ border: '1px solid var(--border)' }}
              >
                <IconSquare variant={item.type === 'deck' ? 'primary' : 'muted'} size={36}>
                  {item.type === 'deck' ? <BookOpen size={18} /> : <FolderOpen size={18} />}
                </IconSquare>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.meta}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Section C - Jump back in */}
      <section>
        <h2 className="section-heading mb-3 text-lg" style={{ color: 'var(--text)', fontWeight: 700 }}>Jump back in</h2>
        {jumpBackIn.length === 0 ? (
          <Card compact>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Brak przerwanych sesji.</p>
          </Card>
        ) : (
          <JumpBackInCarousel items={jumpBackIn} />
        )}
      </section>

      {/* Additional sections removed as requested */}
    </PageContainer>
  )
}
