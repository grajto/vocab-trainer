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
  const [sessionsToday, decks, allReviewStates, dueReviewStates] = await Promise.all([
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
    // Count due cards efficiently with a where clause instead of loading all into memory
    payload.find({
      collection: 'review-states',
      where: { owner: { equals: user.id }, dueAt: { less_than_equal: now.toISOString() } },
      limit: 0,
      depth: 0,
    }),
  ])

  const dueNow = dueReviewStates.totalDocs
  const totalCards = allReviewStates.totalDocs

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight text-indigo-600">Home</h1>
          <span className="text-xs text-slate-400">{user.username || user.email}</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-2xl font-bold tabular-nums">{sessionsToday.totalDocs}</p>
            <p className="text-xs text-violet-200 mt-0.5">Sessions today</p>
          </div>
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-2xl font-bold tabular-nums">{dueNow}</p>
            <p className="text-xs text-amber-100 mt-0.5">Cards due</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl px-5 py-4 text-white shadow-sm">
            <p className="text-2xl font-bold tabular-nums">{totalCards}</p>
            <p className="text-xs text-emerald-100 mt-0.5">Total reviews</p>
          </div>
        </div>

        {/* Primary action */}
        <Link
          href="/learn"
          className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center py-4 rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
        >
          Start Learning
        </Link>

        {/* Navigation grid */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/decks" className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="font-medium text-slate-900">Decks</p>
            <p className="text-xs text-slate-400 mt-0.5">{decks.totalDocs} deck{decks.totalDocs !== 1 ? 's' : ''}</p>
          </Link>
          <Link href="/import" className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="font-medium text-slate-900">Import CSV</p>
            <p className="text-xs text-slate-400 mt-0.5">Bulk add cards</p>
          </Link>
          <Link href="/stats" className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="font-medium text-slate-900">Statistics</p>
            <p className="text-xs text-slate-400 mt-0.5">Progress &amp; history</p>
          </Link>
          <Link href="/admin" className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
            <p className="font-medium text-slate-900">Admin</p>
            <p className="text-xs text-slate-400 mt-0.5">Payload CMS</p>
          </Link>
        </div>
      </main>
    </div>
  )
}
