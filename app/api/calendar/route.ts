import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'

export async function GET(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const now = new Date()
    const url = new URL(req.url)
    const monthParam = url.searchParams.get('month')
    const yearParam = url.searchParams.get('year')
    const month = monthParam ? Number(monthParam) : now.getMonth()
    const year = yearParam ? Number(yearParam) : now.getFullYear()

    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)

    const sessions = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: monthStart.toISOString(), less_than_equal: monthEnd.toISOString() },
      },
      depth: 1,
      limit: 0,
      sort: 'startedAt',
    })

    const settings = getStudySettings(user as unknown as Record<string, unknown>)

    type DayInfo = {
      date: string
      sessions: number
      minutes: number
      status: 'met' | 'partial' | 'none'
      items: Array<{
        id: string
        mode: string
        deckName: string
        accuracy: number | null
        minutes: number
        startedAt: string
        endedAt: string | null
      }>
    }

    const dayMap = new Map<string, DayInfo>()

    for (const session of sessions.docs) {
      if (!session.startedAt) continue
      const start = new Date(session.startedAt)
      const end = session.endedAt ? new Date(session.endedAt) : now
      const minutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`

      if (!dayMap.has(key)) {
        dayMap.set(key, {
          date: key,
          sessions: 0,
          minutes: 0,
          status: 'none',
          items: [],
        })
      }

      const day = dayMap.get(key)!
      day.sessions += 1
      day.minutes += minutes
      day.items.push({
        id: String(session.id),
        mode: session.mode,
        deckName: typeof session.deck === 'object' && session.deck ? (session.deck as { name?: string }).name || 'Deck' : 'Deck',
        accuracy: session.accuracy ?? null,
        minutes,
        startedAt: session.startedAt,
        endedAt: session.endedAt ?? null,
      })
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: DayInfo[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const info = dayMap.get(key) ?? { date: key, sessions: 0, minutes: 0, status: 'none', items: [] }
      const metGoal = isDailyGoalMet(settings, info.sessions, info.minutes)
      if (info.sessions > 0 && !metGoal) info.status = 'partial'
      if (info.sessions > 0 && metGoal) info.status = 'met'
      days.push(info)
    }

    return NextResponse.json({
      month,
      year,
      settings,
      days,
    })
  } catch (error: unknown) {
    console.error('Calendar error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
