import Link from 'next/link'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { redirect } from 'next/navigation'
import { AppShell } from './ui/AppShell'

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const now = new Date()

  const [decks, dueReviewStates, recentSessions] = await Promise.all([
    payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 6,
      sort: '-updatedAt',
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
      limit: 4,
      sort: '-startedAt',
      depth: 1,
    }),
  ])

  const jumpBackDeck = decks.docs[0]

  return (
    <AppShell userLabel={user.username || user.email} activePath="/">
      <div className="space-y-10">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight mb-4">Jump back in</h1>
          {jumpBackDeck ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-lg font-semibold mb-2">{jumpBackDeck.name}</p>
                <p className="text-sm text-neutral-500 mb-4">Kontynuuj naukę i zakończ powtórkę.</p>
                <Link
                  href="/learn"
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
                >
                  Kontynuuj
                </Link>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-emerald-500 rounded-full" />
                </div>
                <p className="text-xs text-neutral-400 mt-2">50% of questions completed</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-sm text-neutral-500">
              Brak zestawów. <Link href="/decks" className="text-blue-600">Utwórz pierwszy zestaw</Link>.
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recents</h2>
            <Link href="/library" className="text-sm text-blue-600">Zobacz wszystko</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.docs.map(deck => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="bg-white border border-neutral-200 rounded-2xl p-4 hover:border-blue-300 transition-colors">
                <p className="font-medium">{deck.name}</p>
                <p className="text-xs text-neutral-400 mt-1">Zestaw fiszek</p>
              </Link>
            ))}
            {decks.docs.length === 0 && (
              <p className="text-sm text-neutral-400">Brak ostatnich zestawów.</p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Do powtórki</h2>
            <span className="text-sm text-neutral-500">{dueReviewStates.totalDocs} kart do powtórki</span>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6">
            <div className="grid sm:grid-cols-2 gap-4">
              {recentSessions.docs.map(session => (
                <div key={session.id} className="border border-neutral-100 rounded-xl p-4">
                  <p className="text-sm font-medium">{session.deck?.name || 'Sesja'}</p>
                  <p className="text-xs text-neutral-400 mt-1">Tryb: {session.mode}</p>
                  <p className="text-xs text-neutral-400">Accuracy: {session.accuracy ?? 0}%</p>
                </div>
              ))}
              {recentSessions.docs.length === 0 && (
                <p className="text-sm text-neutral-400">Brak sesji do wyświetlenia.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
