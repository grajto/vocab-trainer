import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { Bell, Clock, AlertTriangle, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Notification {
  type: 'stale' | 'due' | 'new'
  message: string
  deckId: string
  deckName: string
  count?: number
}

export default async function NotificationsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()

  const [decks, sessions] = await Promise.all([
    payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'sessions',
      where: { owner: { equals: user.id } },
      sort: '-startedAt',
      limit: 200,
      depth: 0,
    }),
  ])

  // Build notifications dynamically
  const notifications: Notification[] = []

  // Find last session per deck
  const lastSessionPerDeck = new Map<string, Date>()
  for (const s of sessions.docs) {
    const did = String(s.deck)
    if (!lastSessionPerDeck.has(did) && s.startedAt) {
      lastSessionPerDeck.set(did, new Date(s.startedAt))
    }
  }

  for (const deck of decks.docs) {
    const did = String(deck.id)
    const lastSession = lastSessionPerDeck.get(did)

    if (!lastSession) {
      // Never studied
      notifications.push({
        type: 'new',
        message: `You haven't studied "${deck.name}" yet. Start now!`,
        deckId: did,
        deckName: deck.name,
      })
    } else {
      const daysSince = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince >= 7) {
        notifications.push({
          type: 'stale',
          message: `It's been ${daysSince} days since you last studied "${deck.name}"`,
          deckId: did,
          deckName: deck.name,
          count: daysSince,
        })
      }
    }
  }

  // Check due cards per deck
  for (const deck of decks.docs) {
    const did = String(deck.id)
    const cardIds = await payload.find({
      collection: 'cards',
      where: { deck: { equals: deck.id }, owner: { equals: user.id } },
      limit: 0,
      depth: 0,
    })

    if (cardIds.totalDocs === 0) continue

    const cards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: deck.id }, owner: { equals: user.id } },
      limit: 1000,
      depth: 0,
    })

    const cIds = cards.docs.map(c => c.id)
    if (cIds.length === 0) continue

    const dueStates = await payload.find({
      collection: 'review-states',
      where: {
        owner: { equals: user.id },
        card: { in: cIds },
        dueAt: { less_than_equal: now.toISOString() },
      },
      limit: 0,
      depth: 0,
    })

    if (dueStates.totalDocs >= 10) {
      notifications.push({
        type: 'due',
        message: `"${deck.name}" has ${dueStates.totalDocs} cards due for review`,
        deckId: did,
        deckName: deck.name,
        count: dueStates.totalDocs,
      })
    }
  }

  // Sort: due first, then stale, then new
  notifications.sort((a, b) => {
    const order = { due: 0, stale: 1, new: 2 }
    return order[a.type] - order[b.type]
  })

  const iconMap = {
    stale: Clock,
    due: AlertTriangle,
    new: BookOpen,
  }

  const colorMap = {
    stale: 'text-amber-500 bg-amber-50',
    due: 'text-red-500 bg-red-50',
    new: 'text-indigo-500 bg-indigo-50',
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">You&apos;re all caught up! No notifications right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type]
            const color = colorMap[n.type]
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{n.message}</p>
                </div>
                <Link
                  href={`/learn?deck=${n.deckId}`}
                  prefetch={true}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  Start
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
