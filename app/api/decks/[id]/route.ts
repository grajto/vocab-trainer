import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { parseNumericId } from '@/src/lib/parseNumericId'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, description, folderId, direction } = body

  const payload = await getPayload()

  try {
    const deck = await payload.findByID({ collection: 'decks', id, depth: 0 })
    if (String(deck.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data: Record<string, unknown> = {}
    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (!trimmed) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
      data.name = trimmed
    }
    if (description !== undefined) data.description = String(description || '').trim()

    const validDirections = ['front-to-back', 'back-to-front', 'both']
    if (direction) {
      if (!validDirections.includes(direction)) {
        return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })
      }
      data.direction = direction
    }

    if (folderId !== undefined) {
      const parsed = parseNumericId(folderId)
      data.folder = parsed
    }

    const updated = await payload.update({
      collection: 'decks',
      id,
      data,
    })

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Deck update error', err)
    return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
  }
}
