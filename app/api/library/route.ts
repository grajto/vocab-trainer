import { NextResponse } from 'next/server'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await getPayload()
    const decks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      sort: '-updatedAt',
      limit: 100,
      depth: 0,
    })

    return NextResponse.json({ decks: decks.docs })
  } catch (error: unknown) {
    console.error('Library api error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
