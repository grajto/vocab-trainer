import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload()
  const sp = req.nextUrl.searchParams
  const deckId = sp.get('deckId')
  const folderId = sp.get('folderId')
  const limit = Math.max(10, Math.min(100, Number(sp.get('limit') || 50)))
  const cursor = Number(sp.get('cursor') || 0)
  const nowIso = new Date().toISOString()

  let deckIds: number[] = []
  if (deckId) {
    deckIds = [Number(deckId)]
  } else if (folderId) {
    const decksInFolder = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id }, folder: { equals: Number(folderId) } },
      limit: 500,
      depth: 0,
    })
    deckIds = decksInFolder.docs.map((d: any) => Number(d.id)).filter(Boolean)
  } else {
    const allDecks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 500,
      depth: 0,
    })
    deckIds = allDecks.docs.map((d: any) => Number(d.id)).filter(Boolean)
  }

  if (deckIds.length === 0) {
    return NextResponse.json({ cards: [], nextCursor: null, totalDue: 0 }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
    })
  }

  const [cards, dueStates] = await Promise.all([
    payload.find({
      collection: 'cards',
      where: { owner: { equals: user.id }, deck: { in: deckIds } },
      sort: 'id',
      limit,
      page: Math.floor(cursor / limit) + 1,
      depth: 0,
    }),
    payload.find({
      collection: 'review-states',
      where: { owner: { equals: user.id }, dueAt: { less_than_equal: nowIso }, card: { exists: true } },
      limit: 5000,
      depth: 0,
    }),
  ])

  const dueByCard = new Set(dueStates.docs.map((r: any) => String(r.card)))
  const compactCards = cards.docs.map((c: any) => ({
    id: String(c.id),
    deckId: String(c.deck),
    front: c.front,
    back: c.back,
    due: dueByCard.has(String(c.id)),
  }))

  const nextCursor = cards.hasNextPage ? cursor + limit : null

  return NextResponse.json({
    cards: compactCards,
    nextCursor,
    totalDue: dueByCard.size,
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=300' },
  })
}
