import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { front, back, notes, examples } = body

  const payload = await getPayload()
  
  try {
    // Verify ownership before updating
    const card = await payload.findByID({ collection: 'cards', id, depth: 0 })
    if (String(card.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await payload.update({
      collection: 'cards',
      id,
      data: {
        ...(front !== undefined && { front: front.trim() }),
        ...(back !== undefined && { back: back.trim() }),
        ...(notes !== undefined && { notes: notes.trim() }),
        ...(examples !== undefined && { examples: examples.trim() }),
      },
    })

    return NextResponse.json(updated)
  } catch (err) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const payload = await getPayload()
  
  try {
    // Verify ownership before deleting
    const card = await payload.findByID({ collection: 'cards', id, depth: 0 })
    if (String(card.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await payload.delete({ collection: 'cards', id })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 })
  }
}
