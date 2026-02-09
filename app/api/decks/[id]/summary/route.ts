import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const payload = await getPayload()

    const deck = await payload.findByID({ collection: 'decks', id, depth: 0 })
    if (String(deck.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const cards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: id }, owner: { equals: user.id } },
      limit: 200,
      depth: 0,
    })

    return NextResponse.json({ deck, cardCount: cards.totalDocs })
  } catch (error: unknown) {
    console.error('Deck summary api error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
