import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import type { SessionDocument } from '@/src/types/session'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await getPayload()
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)

    // Find completed sessions today
    const sessions = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { owner: { equals: user.id } },
          { endedAt: { exists: true } },
          { endedAt: { greater_than_equal: startOfDay.toISOString() } },
        ],
      },
      depth: 0,
      limit: 100,
    })

    // Count total cards completed today
    let cardsCompleted = 0
    let minutesSpent = 0

    for (const session of sessions.docs) {
      const s = session as SessionDocument
      
      if (s.settings?.tasks) {
        cardsCompleted += s.settings.tasks.length
      }
      
      // Calculate minutes
      if (s.startedAt && s.endedAt) {
        const start = new Date(s.startedAt)
        const end = new Date(s.endedAt)
        minutesSpent += Math.round((end.getTime() - start.getTime()) / 60000)
      }
    }

    return NextResponse.json({
      cardsCompleted,
      minutesSpent,
      sessionsCompleted: sessions.docs.length,
    })
  } catch (error) {
    console.error('Daily progress fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}
