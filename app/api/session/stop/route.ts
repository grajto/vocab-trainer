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
      const endedAt = new Date().toISOString()
      await payload.update({
        collection: 'sessions',
        id: sessionId,
        data: { endedAt },
      })

      const rawTestId = (session.settings as Record<string, unknown> | undefined)?.testId
    const linkedTestId = (typeof rawTestId === 'string' || typeof rawTestId === 'number') ? rawTestId : null
      if (session.mode === 'test' && linkedTestId) {
        try {
          const answers = await payload.find({ collection: 'test_answers', where: { test: { equals: linkedTestId } }, limit: 10000, depth: 0 })
          const total = answers.totalDocs
          const correct = answers.docs.filter((a) => a.isCorrect).length
          await payload.update({
            collection: 'tests',
            id: linkedTestId,
            data: {
              status: total > 0 ? 'finished' : 'abandoned',
              finishedAt: endedAt,
              durationMs: Math.max(0, new Date(endedAt).getTime() - new Date(session.startedAt).getTime()),
              scoreCorrect: correct,
              scoreTotal: total,
              scorePercent: total > 0 ? Math.round((correct / total) * 100) : 0,
            },
          })
        } catch (err) {
          console.error('Failed to finalize stopped test:', err)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('Session stop error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
