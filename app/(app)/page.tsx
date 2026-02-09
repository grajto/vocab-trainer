import Link from 'next/link'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { redirect } from 'next/navigation'
import { BookOpen, Brain, ClipboardList, Clock, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const [sessionsToday, decks, dueStates, recentSessions] = await Promise.all([
    payload.find({
      collection: 'sessions',
      where: { owner: { equals: user.id }, startedAt: { greater_than_equal: todayStart.toISOString() } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'review-states',
      where: { owner: { equals: user.id }, dueAt: { less_than_equal: now.toISOString() } },
      limit: 0,
      depth: 0,
    }),
    payload.find({
      collection: 'sessions',
      where: { owner: { equals: user.id } },
      sort: '-startedAt',
      limit: 8,
      depth: 0,
    }),
  ])

  // Build recent decks from sessions
  const deckMap = new Map(decks.docs.map(d => [String(d.id), d]))
  const recentDeckIds = new Set<string>()
  const jumpBackIn: Array<{ deckId: string; name: string; mode: string; sessionId: string }> = []

  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    if (recentDeckIds.has(did)) continue
    recentDeckIds.add(did)
    const deck = deckMap.get(did)
    if (deck) {
      jumpBackIn.push({
        deckId: did,
        name: deck.name,
        mode: s.mode || 'translate',
        sessionId: String(s.id),
      })
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl px-5 py-5 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Today</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">{sessionsToday.totalDocs}</p>
          <p className="text-xs opacity-60 mt-1">sessions</p>
        </div>
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl px-5 py-5 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Due now</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">{dueStates.totalDocs}</p>
          <p className="text-xs opacity-60 mt-1">cards to review</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl px-5 py-5 text-white shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 opacity-80" />
            <span className="text-xs opacity-80">Library</span>
          </div>
          <p className="text-3xl font-bold tabular-nums">{decks.totalDocs}</p>
          <p className="text-xs opacity-60 mt-1">decks</p>
        </div>
      </div>

      {/* Primary CTA */}
      <Link
        href="/learn"
        prefetch={true}
        className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center py-4 rounded-2xl font-semibold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
      >
        <BookOpen className="w-5 h-5" />
        Start Learning
      </Link>

      {/* Jump back in */}
      {jumpBackIn.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Jump back in</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {jumpBackIn.slice(0, 6).map(item => (
              <Link
                key={item.deckId}
                href={`/decks/${item.deckId}`}
                prefetch={true}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <p className="font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">{item.name}</p>
                <p className="text-xs text-slate-400 mt-1 capitalize">{item.mode}</p>
                <div className="mt-3 flex gap-2">
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-md font-medium">Learn</span>
                  <span className="text-xs bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md">Test</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All decks (recents) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Your decks</h2>
          <Link href="/library" prefetch={true} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all →
          </Link>
        </div>
        {decks.docs.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 mb-2">No decks yet</p>
            <Link href="/decks?create=true" className="text-sm text-indigo-600 font-medium hover:text-indigo-700">
              Create your first deck →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {decks.docs.slice(0, 9).map(deck => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                prefetch={true}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <p className="font-medium text-slate-900">{deck.name}</p>
                {deck.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{deck.description}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
