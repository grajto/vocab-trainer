import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ results: [] })

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const payload = await getPayload()

  const [decks, folders, cards] = await Promise.all([
    payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id }, name: { contains: q } },
      limit: 5,
      depth: 0,
    }),
    payload.find({
      collection: 'folders',
      where: { owner: { equals: user.id }, name: { contains: q } },
      limit: 5,
      depth: 0,
    }),
    payload.find({
      collection: 'cards',
      where: {
        owner: { equals: user.id },
        or: [{ front: { contains: q } }, { back: { contains: q } }],
      },
      limit: 8,
      depth: 1,
    }),
  ])

  const results = [
    ...decks.docs.map((d) => ({ type: 'deck' as const, id: String(d.id), name: d.name, meta: '' })),
    ...folders.docs.map((f) => ({ type: 'folder' as const, id: String(f.id), name: f.name, meta: '' })),
    ...cards.docs.map((c) => {
      const cardData = c as {
        id: string | number
        front: string
        back: string
        deck: string | number | { id: string | number }
      }
      return {
        type: 'card' as const,
        id: String(cardData.id),
        name: cardData.front,
        meta: cardData.back,
        deckId: typeof cardData.deck === 'object' ? String(cardData.deck.id) : String(cardData.deck),
      }
    }),
  ]

  return NextResponse.json({ results })
}
