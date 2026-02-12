import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { getUser } from '@/src/lib/getUser'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const payload = await getPayload({ config })
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the card first to verify ownership
    const card = await payload.findByID({
      collection: 'cards',
      id,
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Verify ownership
    const ownerId = typeof card.owner === 'object' ? card.owner.id : card.owner
    if (ownerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { starred } = body

    // Update the card
    const updated = await payload.update({
      collection: 'cards',
      id,
      data: {
        starred: Boolean(starred),
      },
    })

    return NextResponse.json({ success: true, starred: updated.starred })
  } catch (error) {
    console.error('Error updating starred status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
