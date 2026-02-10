/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { Card } from '@/app/(app)/_components/ui/Card'
import { SectionHeader } from '@/app/(app)/_components/ui/SectionHeader'
import { StatCard } from '@/app/(app)/_components/ui/StatCard'
import { ListRow } from '@/app/(app)/_components/ui/ListRow'
import { DeckCard } from '@/app/(app)/_components/ui/DeckCard'
import { Button } from '@/app/(app)/_components/ui/Button'
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
  const jumpBackIn: Array<{ name: string; mode: string; sessionId: string; progress: string; startedAt: string }> = []
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
    if ((s.endedAt === null || completed < target) && !jumpBackIn.find(item => item.sessionId === String(s.id))) {
      jumpBackIn.push({
        name: deck.name,
        mode: s.mode || 'translate',
        sessionId: String(s.id),
        progress: `${completed}/${target}`,
        startedAt: s.startedAt,
      })
    }
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <section>
        <SectionHeader title="Informacyjna" />
        <Card>
          <div className="stats-grid">
            <StatCard label="Dzisiejsze sesje" value={sessionsToday.totalDocs} />
            <StatCard label="Spędzony czas" value={`${timeTodayMinutes} min`} />
            <StatCard label="Current streak" value={`${streakDays} days`} />
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Jump back in" />
        <Card>
          <JumpBackInList initialItems={jumpBackIn} />
        </Card>
      </section>

      <section>
        <SectionHeader title="Ostatnie" />
        <Card>
          <div className="list">
            {recentDecks.length === 0 ? (
              <p className="p-muted">No recent sets yet.</p>
            ) : recentDecks.slice(0, 8).map(deck => (
              <ListRow
                key={deck.deckId}
                title={deck.name}
                meta={`${deck.cardCount} terms • last studied ${new Date(deck.lastUsed).toLocaleDateString('pl-PL')}`}
                actions={<Link href={`/decks/${deck.deckId}`}><Button variant="secondary">Open</Button></Link>}
              />
            ))}
          </div>
        </Card>
      </section>

      <section>
        <SectionHeader title="Twoje zasoby" action={<Link href="/library"><Button variant="ghost">Open all</Button></Link>} />
        <div className="resource-grid">
          {folders.docs.map((folder: any) => (
            <DeckCard key={`folder-${folder.id}`} href={`/folders/${folder.id}`} title={`📁 ${folder.name}`} meta="Folder" />
          ))}
          {decks.docs.map((deck: any) => (
            <DeckCard key={`deck-${deck.id}`} href={`/decks/${deck.id}`} title={`📘 ${deck.name}`} meta={`${deck.cardCount || 0} terms`} />
          ))}
        </div>
      </section>
    </div>
  )
}
