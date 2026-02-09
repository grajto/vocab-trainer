import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { requireAppToken } from '@/src/lib/requireAppToken'

export async function POST(req: NextRequest) {
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

    if (!session.endedAt) {
      await payload.update({
        collection: 'sessions',
        id: sessionId,
        data: { endedAt: new Date().toISOString() },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Session stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
