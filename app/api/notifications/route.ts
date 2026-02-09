import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const now = new Date()

    const [decks, sessions, cards, dueStates, todaySessions, reviewStates] = await Promise.all([
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        limit: 200,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id } },
        sort: '-startedAt',
        limit: 300,
        depth: 0,
      }),
      payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id } },
        limit: 2000,
        depth: 0,
      }),
      payload.find({
        collection: 'review-states',
        where: {
          owner: { equals: user.id },
          dueAt: { less_than_equal: now.toISOString() },
        },
        limit: 2000,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: {
          owner: { equals: user.id },
          startedAt: { greater_than_equal: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() },
        },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'review-states',
        where: { owner: { equals: user.id } },
        sort: '-totalWrong',
        limit: 50,
        depth: 0,
      }),
    ])

    const settings = getStudySettings(user as Record<string, unknown>)
    const lastSessionPerDeck = new Map<string, Date>()
    for (const s of sessions.docs) {
      const did = String(s.deck)
      if (!lastSessionPerDeck.has(did) && s.startedAt) {
        lastSessionPerDeck.set(did, new Date(s.startedAt))
      }
    }

    const cardDeckMap = new Map<string, string>()
    for (const card of cards.docs) {
      cardDeckMap.set(String(card.id), String(card.deck))
    }

    const dueCountByDeck = new Map<string, number>()
    for (const rs of dueStates.docs) {
      const did = cardDeckMap.get(String(rs.card))
      if (!did) continue
      dueCountByDeck.set(did, (dueCountByDeck.get(did) || 0) + 1)
    }

    const notifications: Array<{
      type: 'stale' | 'due' | 'goal' | 'hard'
      message: string
      deckId?: string
      deckName?: string
      count?: number
      cardId?: string
    }> = []

    for (const deck of decks.docs) {
      const did = String(deck.id)
      const lastSession = lastSessionPerDeck.get(did)
      if (!lastSession) {
        notifications.push({
          type: 'stale',
          message: `Zestaw "${deck.name}" nie był jeszcze powtarzany.`,
          deckId: did,
          deckName: deck.name,
        })
      } else {
        const daysSince = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
        if (daysSince >= 7) {
          notifications.push({
            type: 'stale',
            message: `Minęło ${daysSince} dni od ostatniej nauki "${deck.name}".`,
            deckId: did,
            deckName: deck.name,
            count: daysSince,
          })
        }
      }

      const dueCount = dueCountByDeck.get(did) || 0
      if (dueCount >= 10) {
        notifications.push({
          type: 'due',
          message: `"${deck.name}" ma ${dueCount} kart do powtórki.`,
          deckId: did,
          deckName: deck.name,
          count: dueCount,
        })
      }
    }

    const totalMinutesToday = todaySessions.docs.reduce((sum, s) => {
      if (!s.startedAt) return sum
      const start = new Date(s.startedAt)
      const end = s.endedAt ? new Date(s.endedAt) : now
      return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
    }, 0)
    const metGoal = isDailyGoalMet(settings, todaySessions.totalDocs, totalMinutesToday)
    if (!metGoal) {
      notifications.push({
        type: 'goal',
        message: 'Masz dziś zaległości – nie spełniłeś celu dziennego.',
      })
    }

    const hardest = reviewStates.docs
      .filter(rs => (rs.totalWrong ?? 0) > 0)
      .slice(0, 5)

    for (const rs of hardest) {
      notifications.push({
        type: 'hard',
        message: 'Najtrudniejsze karty z ostatnich dni – warto powtórzyć.',
        cardId: String(rs.card),
      })
    }

    return NextResponse.json({ notifications })
  } catch (error: unknown) {
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
