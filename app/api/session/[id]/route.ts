import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import { requireAppToken } from '@/src/lib/requireAppToken'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireAppToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const payload = await getPayload()

  try {
    const session = await payload.findByID({ collection: 'sessions', id, depth: 0 })
    if (String(session.owner) !== String(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const settings = (session.settings || {}) as Record<string, unknown>
    const tasks = Array.isArray(settings.tasks) ? settings.tasks : []
    return NextResponse.json({
      sessionId: String(session.id),
      mode: String(session.mode || 'translate'),
      returnDeckId: session.deck ? String(session.deck) : '',
      tasks,
    })
  } catch (error) {
    console.error('Session GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
