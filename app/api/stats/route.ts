import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const now = new Date()

    // Get today's start and this week's start
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    // Sessions today
    const sessionsToday = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: todayStart.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    // Sessions this week
    const sessionsThisWeek = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: weekStart.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    // Recent sessions (last 20)
    const recentSessions = await payload.find({
      collection: 'sessions',
      where: { owner: { equals: user.id } },
      sort: '-startedAt',
      limit: 20,
      depth: 1,
    })

    // Calculate average accuracy from recent sessions
    const completedSessions = recentSessions.docs.filter(s => s.endedAt)
    const avgAccuracy = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / completedSessions.length)
      : 0

    // Calculate streak (consecutive days with at least one session)
    const yearAgo = new Date(now)
    yearAgo.setFullYear(yearAgo.getFullYear() - 1)
    const allSessions = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: yearAgo.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    // Build a set of date strings (YYYY-MM-DD) that have sessions
    const sessionDays = new Set<string>()
    for (const s of allSessions.docs) {
      if (s.startedAt) {
        const d = new Date(s.startedAt)
        sessionDays.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
      }
    }

    let streakDays = 0
    const checkDate = new Date(now)
    checkDate.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const key = `${checkDate.getFullYear()}-${checkDate.getMonth()}-${checkDate.getDate()}`
      if (sessionDays.has(key)) {
        streakDays++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    // Per deck stats
    const decks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 100,
      depth: 0,
    })

    const deckStats = []
    for (const deck of decks.docs) {
      const cards = await payload.find({
        collection: 'cards',
        where: { deck: { equals: deck.id }, owner: { equals: user.id } },
        limit: 0,
        depth: 0,
      })

      const reviewStates = await payload.find({
        collection: 'review-states',
        where: {
          owner: { equals: user.id },
          card: { in: cards.docs.map(c => c.id) },
        },
        limit: 1000,
        depth: 0,
      })

      const dueCount = reviewStates.docs.filter(rs => new Date(rs.dueAt) <= now).length
      const levelDist = { 1: 0, 2: 0, 3: 0, 4: 0 }
      for (const rs of reviewStates.docs) {
        const lvl = rs.level as 1 | 2 | 3 | 4
        if (lvl >= 1 && lvl <= 4) levelDist[lvl]++
      }
      const total = reviewStates.docs.length
      const percentLevel4 = total > 0 ? Math.round((levelDist[4] / total) * 100) : 0

      deckStats.push({
        deckId: deck.id,
        deckName: deck.name,
        cardCount: cards.totalDocs,
        dueCount,
        levelDistribution: levelDist,
        percentLevel4,
      })
    }

    // Format recent sessions for history
    const history = recentSessions.docs.map(s => ({
      id: s.id,
      mode: s.mode,
      deckName: typeof s.deck === 'object' && s.deck !== null ? (s.deck as { name?: string }).name : 'Unknown',
      targetCount: s.targetCount,
      completedCount: s.completedCount,
      accuracy: s.accuracy,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
    }))

    return NextResponse.json({
      global: {
        sessionsToday: sessionsToday.totalDocs,
        sessionsThisWeek: sessionsThisWeek.totalDocs,
        streakDays,
        avgAccuracy,
      },
      deckStats,
      history,
    })
  } catch (error: unknown) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
