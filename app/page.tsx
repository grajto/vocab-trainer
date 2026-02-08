import Link from 'next/link'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  // Fetch stats server-side for fast initial render
  const [sessionsToday, decks, allReviewStates] = await Promise.all([
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
      where: { owner: { equals: user.id } },
      limit: 0,
      depth: 0,
    }),
  ])

  // Count cards due now
  const dueNow = allReviewStates.docs.filter(rs => new Date(rs.dueAt) <= now).length
  const totalCards = allReviewStates.totalDocs

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Vocab Trainer</h1>
          <span className="text-xs text-neutral-400">{user.email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">{sessionsToday.totalDocs}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Sessions today</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">{dueNow}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Cards due</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl px-5 py-4">
            <p className="text-2xl font-bold tabular-nums">{totalCards}</p>
            <p className="text-xs text-neutral-500 mt-0.5">Total reviews</p>
          </div>
        </div>

        {/* Primary action */}
        <Link
          href="/learn"
          className="block w-full bg-neutral-900 text-white text-center py-4 rounded-xl font-medium hover:bg-neutral-800 transition-colors"
        >
          Start Learning
        </Link>

        {/* Navigation grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/decks" className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors">
            <p className="font-medium">Decks</p>
            <p className="text-xs text-neutral-400 mt-0.5">{decks.totalDocs} deck{decks.totalDocs !== 1 ? 's' : ''}</p>
          </Link>
          <Link href="/import" className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors">
            <p className="font-medium">Import CSV</p>
            <p className="text-xs text-neutral-400 mt-0.5">Bulk add cards</p>
          </Link>
          <Link href="/stats" className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors">
            <p className="font-medium">Statistics</p>
            <p className="text-xs text-neutral-400 mt-0.5">Progress &amp; history</p>
          </Link>
          <a href="/admin" className="bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors">
            <p className="font-medium">Admin</p>
            <p className="text-xs text-neutral-400 mt-0.5">Payload CMS</p>
          </a>
        </div>
      </main>
    </div>
  )
}
