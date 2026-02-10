import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { requireAppToken } from '@/src/lib/requireAppToken'

export async function DELETE(req: NextRequest) {
  try {
    if (!requireAppToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionId } = await req.json()
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 })

    const payload = await getPayload()
    const session = await payload.findByID({ collection: 'sessions', id: sessionId, depth: 0 })
    if (String(session.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await payload.delete({ collection: 'sessions', id: sessionId })

    const items = await payload.find({
      collection: 'session-items',
      where: { session: { equals: sessionId } },
      depth: 0,
      limit: 500,
    })

    await Promise.all(items.docs.map(item => payload.delete({ collection: 'session-items', id: item.id })))

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Session delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
