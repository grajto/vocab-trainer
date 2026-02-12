import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireAppToken } from '@/src/lib/requireAppToken'
import { getUser } from '@/src/lib/getUser'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAppToken(request)
    const user = await getUser(request)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { starred } = await request.json()
    const payload = await getPayload({ config })

    // Update the card
    const card = await payload.update({
      collection: 'cards',
      id: id,
      data: {
        starred: starred === true,
      },
    })

    // Verify ownership
    if (typeof card.owner === 'object' && card.owner.id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true, starred: card.starred })
  } catch (error) {
    console.error('Error toggling starred:', error)
    return NextResponse.json(
      { error: 'Failed to toggle starred status' },
      { status: 500 }
    )
  }
}
