import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { getStudySettings, isDailyGoalMet } from '@/src/lib/userSettings'

type GeneratedNotification = {
  type: 'stale' | 'due' | 'goal' | 'hard'
  message: string
  deckId?: string
  cardId?: string
  count?: number
  sourceKey: string
}


function isMissingDbObjectError(error: unknown): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } }
  const code = candidate?.cause?.code || candidate?.code
  return code === '42P01' || code === '42703'
}

async function buildGenerated(userId: string | number) {
  const payload = await getPayload()
  const now = new Date()

  const [decks, sessions, cards, dueStates, todaySessions, reviewStates, userFull] = await Promise.all([
    payload.find({ collection: 'decks', where: { owner: { equals: userId } }, limit: 200, depth: 0 }),
    payload.find({ collection: 'sessions', where: { owner: { equals: userId } }, sort: '-startedAt', limit: 300, depth: 0 }),
    payload.find({ collection: 'cards', where: { owner: { equals: userId } }, limit: 2000, depth: 0 }),
    payload.find({ collection: 'review-states', where: { owner: { equals: userId }, dueAt: { less_than_equal: now.toISOString() } }, limit: 2000, depth: 0 }),
    payload.find({ collection: 'sessions', where: { owner: { equals: userId }, startedAt: { greater_than_equal: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() } }, limit: 0, depth: 0 }),
    payload.find({ collection: 'review-states', where: { owner: { equals: userId } }, sort: '-totalWrong', limit: 50, depth: 0 }),
    payload.findByID({ collection: 'users', id: userId, depth: 0 }),
  ])

  const settings = getStudySettings(userFull as Record<string, unknown>)
  const lastSessionPerDeck = new Map<string, Date>()
  for (const s of sessions.docs) {
    const did = String(s.deck)
    if (!lastSessionPerDeck.has(did) && s.startedAt) {
      lastSessionPerDeck.set(did, new Date(s.startedAt))
    }
  }

  const cardDeckMap = new Map<string, string>()
  for (const card of cards.docs) cardDeckMap.set(String(card.id), String(card.deck))

  const dueCountByDeck = new Map<string, number>()
  for (const rs of dueStates.docs) {
    const did = cardDeckMap.get(String(rs.card))
    if (!did) continue
    dueCountByDeck.set(did, (dueCountByDeck.get(did) || 0) + 1)
  }

  const generated: GeneratedNotification[] = []

  for (const deck of decks.docs) {
    const did = String(deck.id)
    const lastSession = lastSessionPerDeck.get(did)
    if (!lastSession) {
      generated.push({ type: 'stale', message: `Zestaw "${deck.name}" nie był jeszcze powtarzany.`, deckId: did, sourceKey: `stale-never-${did}` })
    } else {
      const daysSince = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince >= 7) {
        generated.push({ type: 'stale', message: `Minęło ${daysSince} dni od ostatniej nauki "${deck.name}".`, deckId: did, count: daysSince, sourceKey: `stale-days-${did}-${daysSince}` })
      }
    }

    const dueCount = dueCountByDeck.get(did) || 0
    if (dueCount >= 10) {
      generated.push({ type: 'due', message: `"${deck.name}" ma ${dueCount} kart do powtórki.`, deckId: did, count: dueCount, sourceKey: `due-${did}-${dueCount}` })
    }
  }

  const totalMinutesToday = todaySessions.docs.reduce((sum, s) => {
    if (!s.startedAt) return sum
    const start = new Date(s.startedAt)
    const end = s.endedAt ? new Date(s.endedAt) : now
    return sum + Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000))
  }, 0)
  const metGoal = isDailyGoalMet(settings, todaySessions.totalDocs, totalMinutesToday)
  if (!metGoal) generated.push({ type: 'goal', message: 'Masz dziś zaległości – nie spełniłeś celu dziennego.', sourceKey: `goal-${now.toISOString().slice(0,10)}` })

  for (const rs of reviewStates.docs.filter(rs => (rs.totalWrong ?? 0) > 0).slice(0, 5)) {
    generated.push({ type: 'hard', message: 'Najtrudniejsze karty z ostatnich dni – warto powtórzyć.', cardId: String(rs.card), sourceKey: `hard-${String(rs.card)}-${Number(rs.totalWrong || 0)}` })
  }

  return generated
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const generated = await buildGenerated(user.id)

    for (const g of generated) {
      const existing = await payload.find({
        collection: 'user_notifications',
        where: { owner: { equals: user.id }, sourceKey: { equals: g.sourceKey } },
        limit: 1,
        depth: 0,
      })
      if (existing.docs.length === 0) {
        await payload.create({
          collection: 'user_notifications',
          data: {
            owner: user.id,
            type: g.type,
            message: g.message,
            deck: g.deckId,
            card: g.cardId,
            count: g.count,
            sourceKey: g.sourceKey,
            read: false,
          },
        })
      }
    }

    const notifications = await payload.find({
      collection: 'user_notifications',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 80,
      depth: 1,
    })

    const unreadCount = notifications.docs.filter((n) => !n.read).length

    return NextResponse.json({
      notifications: notifications.docs.map((n) => ({
        id: String(n.id),
        type: n.type,
        message: n.message,
        deckId: typeof n.deck === 'object' && n.deck ? String(n.deck.id) : n.deck ? String(n.deck) : undefined,
        read: Boolean(n.read),
        createdAt: n.createdAt,
      })),
      unreadCount,
    })
  } catch (error: unknown) {
    if (isMissingDbObjectError(error)) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const payload = await getPayload()
    const body = await req.json()
    const { id, markAllRead } = body as { id?: string; markAllRead?: boolean }

    if (markAllRead) {
      const all = await payload.find({ collection: 'user_notifications', where: { owner: { equals: user.id }, read: { equals: false } }, limit: 200, depth: 0 })
      for (const n of all.docs) {
        await payload.update({ collection: 'user_notifications', id: n.id, data: { read: true, readAt: new Date().toISOString() } })
      }
      return NextResponse.json({ ok: true })
    }

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    const notification = await payload.findByID({ collection: 'user_notifications', id, depth: 0 })
    if (String(notification.owner) !== String(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await payload.update({ collection: 'user_notifications', id, data: { read: true, readAt: new Date().toISOString() } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    if (isMissingDbObjectError(error)) {
      return NextResponse.json({ ok: true })
    }
    console.error('Notifications patch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
