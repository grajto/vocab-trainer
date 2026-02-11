/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowRight, BarChart3, BookOpen, Calendar, FolderOpen, Play } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'
import { IconSquare } from '../_components/ui/IconSquare'
import { Card } from '../_components/ui/Card'
import { Button } from '../_components/ui/Button'
import { type ContinueItem } from './_components/ContinueCard'
import { JumpBackInCarousel } from './_components/JumpBackInCarousel'
import { StartSessionButton } from './_components/StartSessionButton'

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

  const remainingToGoal = Math.max(0, Math.max(1, settings.minSessionsPerDay) - sessionsToday.totalDocs)
  const todayProgress = Math.min(100, Math.round((sessionsToday.totalDocs / Math.max(1, settings.minSessionsPerDay)) * 100))

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

  // Get hardest decks for recommendations with smart mode selection
  const recommendedDecks = [...jumpBackIn]
    .sort((a, b) => a.progressPercent - b.progressPercent)
    .slice(0, 3)
    .map((item, index) => {
      // Smart mode selection based on progress and index
      const modes = ['abcd', 'translate', 'sentence', 'describe', 'mixed'] as const
      const selectedMode = modes[index % modes.length]
      
      return {
        id: item.resumeHref.split('/').pop() || '',
        title: item.deckName,
        reason: item.progressPercent < 30 ? 'Wysoki % błędów' : `${item.progressPercent}% ukończone`,
        mode: selectedMode,
        modeLabel: {
          abcd: 'ABCD',
          translate: 'Tłumaczenie',
          sentence: 'Zdania',
          describe: 'Opisz',
          mixed: 'Mix'
        }[selectedMode]
      }
    })

  // Calculate deck performance stats from recent sessions
  const deckStats = new Map<string, { name: string; totalSessions: number; accuracy: number; lastUsed: Date }>()
  for (const s of recentSessions.docs.slice(0, 15)) {
    const deck = deckMap.get(String(s.deck))
    if (!deck || !s.accuracy) continue
    
    const existing = deckStats.get(String(s.deck))
    if (!existing) {
      deckStats.set(String(s.deck), {
        name: deck.name,
        totalSessions: 1,
        accuracy: Number(s.accuracy),
        lastUsed: new Date(s.startedAt)
      })
    } else {
      existing.totalSessions++
      existing.accuracy = (existing.accuracy + Number(s.accuracy)) / 2
      if (new Date(s.startedAt) > existing.lastUsed) {
        existing.lastUsed = new Date(s.startedAt)
      }
    }
  }

  // Get hardest and easiest decks based on accuracy
  const sortedDecks = Array.from(deckStats.entries())
    .filter(([_, stats]) => stats.totalSessions >= 1)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
  
  const hardestSets = sortedDecks.slice(0, 3).map(([id, stats]) => ({
    name: stats.name,
    accuracy: Math.round(stats.accuracy),
    id
  }))
  
  const easiestSets = sortedDecks.slice(-3).reverse().map(([id, stats]) => ({
    name: stats.name,
    accuracy: Math.round(stats.accuracy),
    id
  }))

  return (
    <div className="mx-auto w-full space-y-8 px-4 py-6 lg:px-0" style={{ maxWidth: 'var(--container-max)' }}>
      {/* Section A - Informacje (unified analytical card) */}
      <section>
        <h2 className="section-heading mb-3" style={{ color: 'var(--gray600)', fontWeight: 600 }}>Informacje</h2>
        <Card>
          {/* A1: Three compact stats */}
          <div className="grid grid-cols-3 gap-4 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Sesje dzisiaj</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{sessionsToday.totalDocs}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Czas dzisiaj</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{timeTodayMinutes} min</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Seria</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{streakDays} dni</p>
            </div>
          </div>

          {/* A2: Goal + progress */}
          <div className="py-5" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Cel dzienny: {settings.minSessionsPerDay} sesji</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pozostało: {remainingToGoal}</p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#e9edf7' }}>
              <div className="h-full rounded-full" style={{ background: 'var(--success)', width: `${todayProgress}%` }} />
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>Do końca celu brakuje: {remainingToGoal} sesji</p>
          </div>
        </Card>
      </section>

      {/* NEW Section - Co powtórzyć dziś */}
      <section>
        <h2 className="section-heading mb-3" style={{ color: 'var(--gray600)', fontWeight: 600 }}>Co powtórzyć dziś</h2>
        {recommendedDecks.length === 0 ? (
          <Card compact>
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>Wszystko aktualne! Możesz rozpocząć nową sesję.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {recommendedDecks.map((item) => (
              <Card key={item.id} compact>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <IconSquare variant="primary" size={36}>
                      <BookOpen size={18} />
                    </IconSquare>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{item.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.reason}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Tryb:</span>
                      <span className="font-medium" style={{ color: 'var(--primary)' }}>{item.modeLabel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Słówka:</span>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>20</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>Język:</span>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>🇬🇧 Angielski</span>
                    </div>
                  </div>
                  <StartSessionButton 
                    deckId={item.id}
                    mode={item.mode}
                    targetCount={20}
                    direction="en-pl"
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Section B - Jump back in */}
      <section>
        <h2 className="section-heading mb-3" style={{ color: 'var(--gray600)', fontWeight: 600 }}>Jump back in</h2>
        {jumpBackIn.length === 0 ? (
          <Card compact>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Brak przerwanych sesji.</p>
          </Card>
        ) : (
          <JumpBackInCarousel items={jumpBackIn} />
        )}
      </section>

      {/* Section C - Recents */}
      <section>
        <h2 className="section-heading mb-3" style={{ color: 'var(--gray600)', fontWeight: 600 }}>Recents</h2>
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

      {/* Section D - Bottom row (two cards) */}
      <section className="grid gap-4 lg:grid-cols-2">
        {/* D1: Twoja aktywność */}
        <Card>
          <h3 className="flex items-center gap-2 text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
            <BarChart3 size={18} />
            Twoja aktywność
          </h3>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-3" style={{ background: 'var(--surface-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sesje dziś</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{sessionsToday.totalDocs}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--surface-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Seria</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{streakDays} dni</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--surface-muted)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Łącznie</p>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{allSessionsYear.totalDocs}</p>
            </div>
          </div>

          {/* Calendar heatmap */}
          <div className="mb-4">
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Ostatnie 5 dni</p>
            <div className="grid grid-cols-5 gap-2">
              {last5Days.map((day) => (
                <div
                  key={day.label}
                  className="rounded-lg p-2 text-center transition-colors"
                  style={{ background: day.met ? '#eaf8ef' : day.sessions > 0 ? '#fff8dd' : 'var(--surface-muted)' }}
                >
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{day.label}</p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--text)' }}>{day.sessions}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Performance stats */}
          {hardestSets.length > 0 && (
            <div className="space-y-3">
              <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: 'var(--danger)' }}>⚠️ Najtrudniejsze zestawy</p>
                <div className="space-y-1.5">
                  {hardestSets.map((set) => (
                    <div key={set.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#fee2e2' }}>
                      <p className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{set.name}</p>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger)', color: '#fff' }}>
                        {set.accuracy}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {easiestSets.length > 0 && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--success)' }}>✓ Najlepsze zestawy</p>
                  <div className="space-y-1.5">
                    {easiestSets.map((set) => (
                      <div key={set.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#eaf8ef' }}>
                        <p className="text-xs font-medium truncate flex-1" style={{ color: 'var(--text)' }}>{set.name}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--success)', color: '#fff' }}>
                          {set.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* D2: Rozpocznij */}
        <Card>
          <h3 className="flex items-center gap-2 text-base font-bold mb-4" style={{ color: 'var(--text)' }}>
            <Play size={18} />
            Rozpocznij
          </h3>

          <div className="space-y-3">
            <Link href="/study" className="flex items-center gap-3 p-4 rounded-xl transition-colors" style={{ background: 'var(--primary-soft)', border: '1px solid transparent' }}>
              <IconSquare variant="primary" size={36}>
                <BookOpen size={18} />
              </IconSquare>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>Ucz się</p>
                <p className="text-xs" style={{ color: 'var(--primary)' }}>Rozpocznij nową sesję nauki</p>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--primary)' }} />
            </Link>

            <Link href="/learn" className="flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--hover-bg)]" style={{ border: '1px solid var(--border)' }}>
              <IconSquare variant="muted" size={36}>
                <AlertCircle size={18} />
              </IconSquare>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Wykonaj test</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sprawdź swoją wiedzę</p>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
            </Link>

            <Link href="/create" className="flex items-center gap-3 p-4 rounded-xl transition-colors hover:bg-[var(--hover-bg)]" style={{ border: '1px solid var(--border)' }}>
              <IconSquare variant="muted" size={36}>
                <Calendar size={18} />
              </IconSquare>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Kreator zestawów</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Twórz nowe materiały</p>
              </div>
              <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}
