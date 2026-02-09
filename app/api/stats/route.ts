import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const now = new Date()

    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const weekStart = new Date(now)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const sessionsToday = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: todayStart.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    const sessionsThisWeek = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: weekStart.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    const last7DaysStart = new Date(now)
    last7DaysStart.setDate(last7DaysStart.getDate() - 6)
    last7DaysStart.setHours(0, 0, 0, 0)

    const sessionsLast7Days = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        startedAt: { greater_than_equal: last7DaysStart.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    const recentSessions = await payload.find({
      collection: 'sessions',
      where: { owner: { equals: user.id } },
      sort: '-startedAt',
      limit: 20,
      depth: 1,
    })

    const completedSessions = recentSessions.docs.filter(s => s.endedAt)
    const avgAccuracy = completedSessions.length > 0
      ? Math.round(completedSessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / completedSessions.length)
      : 0

    const minutesLast7Days = sessionsLast7Days.docs.reduce((sum, s) => {
      if (!s.startedAt) return sum
      const start = new Date(s.startedAt)
      const end = s.endedAt ? new Date(s.endedAt) : now
      return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
    }, 0)

    // Calculate streak
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

    const sessionsByDay: Array<{ date: string; count: number; minutes: number }> = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      d.setHours(0, 0, 0, 0)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const daySessions = allSessions.docs.filter(s => {
        if (!s.startedAt) return false
        const sd = new Date(s.startedAt)
        return `${sd.getFullYear()}-${sd.getMonth()}-${sd.getDate()}` === key
      })
      const minutes = daySessions.reduce((sum, s) => {
        if (!s.startedAt) return sum
        const start = new Date(s.startedAt)
        const end = s.endedAt ? new Date(s.endedAt) : now
        return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
      }, 0)
      sessionsByDay.push({
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        count: daySessions.length,
        minutes,
      })
    }

    // Per deck stats
    const decks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 100,
      depth: 0,
    })

    const deckStats: Array<{
      deckId: string | number
      deckName: string
      cardCount: number
      dueCount: number
      levelDistribution: Record<number, number>
      percentLevel4: number
    }> = []
    const allHardestCards: Array<{
      cardId: string | number
      front: string
      back: string
      totalWrong: number
      todayWrongCount: number
      level: number
      deckName: string
      deckId: string | number
    }> = []

    for (const deck of decks.docs) {
      const cards = await payload.find({
        collection: 'cards',
        where: { deck: { equals: deck.id }, owner: { equals: user.id } },
        limit: 1000,
        depth: 0,
      })

      if (cards.docs.length === 0) {
        deckStats.push({
          deckId: deck.id,
          deckName: deck.name,
          cardCount: 0,
          dueCount: 0,
          levelDistribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
          percentLevel4: 0,
        })
        continue
      }

      const reviewStates = await payload.find({
        collection: 'review-states',
        where: {
          owner: { equals: user.id },
          card: { in: cards.docs.map(c => c.id) },
        },
        limit: 1000,
        depth: 0,
      })

      const rsMap = new Map<string, (typeof reviewStates.docs)[0]>()
      for (const rs of reviewStates.docs) {
        rsMap.set(String(rs.card), rs)
      }

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

      // Collect hardest cards
      for (const card of cards.docs) {
        const rs = rsMap.get(String(card.id))
        if (rs && (rs.totalWrong ?? 0) > 0) {
          allHardestCards.push({
            cardId: card.id,
            front: card.front,
            back: card.back,
            totalWrong: rs.totalWrong ?? 0,
            todayWrongCount: rs.todayWrongCount ?? 0,
            level: rs.level,
            deckName: deck.name,
            deckId: deck.id,
          })
        }
      }
    }

    // Sort hardest cards by totalWrong descending, take top 20
    allHardestCards.sort((a, b) => b.totalWrong - a.totalWrong)
    const hardestCards = allHardestCards.slice(0, 20)

    const problematicDecks = Object.values(allHardestCards.reduce((acc, card) => {
      const key = String(card.deckId)
      if (!acc[key]) {
        acc[key] = { deckId: String(card.deckId), deckName: card.deckName, totalWrong: 0 }
      }
      acc[key].totalWrong += card.totalWrong
      return acc
    }, {} as Record<string, { deckId: string; deckName: string; totalWrong: number }>))
      .sort((a, b) => b.totalWrong - a.totalWrong)
      .slice(0, 5)

    // Per folder stats
    let folderStats: Array<{
      folderId: string | number
      folderName: string
      deckCount: number
      totalCards: number
      totalDue: number
      avgMastery: number
    }> = []

    try {
      const folders = await payload.find({
        collection: 'folders',
        where: { owner: { equals: user.id } },
        limit: 100,
        depth: 0,
      })

      folderStats = folders.docs.map(folder => {
        const folderDecks = deckStats.filter(d => {
          const matchDeck = decks.docs.find(dd => String(dd.id) === String(d.deckId))
          return matchDeck && String((matchDeck as any).folder) === String(folder.id)
        })

        const totalCards = folderDecks.reduce((s, d) => s + d.cardCount, 0)
        const totalDue = folderDecks.reduce((s, d) => s + d.dueCount, 0)
        const avgMastery = folderDecks.length > 0
          ? Math.round(folderDecks.reduce((s, d) => s + d.percentLevel4, 0) / folderDecks.length)
          : 0

        return {
          folderId: folder.id,
          folderName: folder.name,
          deckCount: folderDecks.length,
          totalCards,
          totalDue,
          avgMastery,
        }
      })
    } catch {
      // Folders may not exist yet
    }

    // Global level distribution
    const globalLevelDist = { 1: 0, 2: 0, 3: 0, 4: 0 }
    for (const d of deckStats) {
      for (const lvl of [1, 2, 3, 4] as const) {
        globalLevelDist[lvl] += d.levelDistribution[lvl] || 0
      }
    }

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
        minutesLast7Days,
        streakDays,
        avgAccuracy,
        levelDistribution: globalLevelDist,
      },
      sessionsByDay,
      problematicDecks,
      deckStats,
      folderStats,
      hardestCards,
      history,
    })
  } catch (error: unknown) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
