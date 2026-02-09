import { NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const now = new Date()

    const [decks, dueReviewStates, recentSessions] = await Promise.all([
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        limit: 6,
        sort: '-updatedAt',
        depth: 0,
      }),
      payload.find({
        collection: 'review-states',
        where: { owner: { equals: user.id }, dueAt: { less_than_equal: now.toISOString() } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id } },
        limit: 4,
        sort: '-startedAt',
        depth: 1,
      }),
    ])

    return NextResponse.json({
      decks: decks.docs,
      dueCount: dueReviewStates.totalDocs,
      recentSessions: recentSessions.docs,
    })
  } catch (error: unknown) {
    console.error('Home api error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
