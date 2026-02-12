import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'
import type { SessionDocument } from '@/src/types/session'

interface Task {
  completed?: boolean
}

interface SessionWithDeck extends SessionDocument {
  deck?: { id: string; name: string } | string
  mode?: string
  targetCount?: number
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await getPayload()

    // Find the most recent active session (not ended)
    const result = await payload.find({
      collection: 'sessions',
      where: {
        and: [
          { owner: { equals: user.id } },
          { endedAt: { exists: false } },
        ],
      },
      sort: '-startedAt',
      limit: 1,
      depth: 1,
    })

    if (result.docs.length === 0) {
      return NextResponse.json({ session: null })
    }

    const session = result.docs[0] as SessionWithDeck

    // Calculate progress
    const tasks = session.settings?.tasks || []
    const totalTasks = session.targetCount || tasks.length || 0
    const completedTasks = tasks.filter((t) => (t as Task).completed).length
    const progressRatio = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Get deck name
    let deckName = 'Codzienna sesja'
    if (session.deck && typeof session.deck === 'object') {
      deckName = session.deck.name
    }

    return NextResponse.json({
      session: {
        id: String(session.id),
        deckName,
        progress: `${completedTasks}/${totalTasks}`,
        progressRatio,
        mode: session.mode || 'mixed',
      },
    })
  } catch (error) {
    console.error('Active session fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch active session' }, { status: 500 })
  }
}
