import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AppShell } from '../ui/AppShell'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id } },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
  })

  return (
    <AppShell userLabel={user.username || user.email} activePath="/library">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Twoje zasoby</h1>
          <p className="text-sm text-neutral-500 mt-1">Zarządzaj zestawami i folderami jak w Quizlet.</p>
        </div>

        <div className="flex items-center gap-4 border-b border-neutral-200 text-sm">
          <button className="border-b-2 border-blue-600 pb-2 font-medium text-blue-600">Decki</button>
          <button className="pb-2 text-neutral-400">Foldery</button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-500">Sortuj: Ostatnie</div>
          <input
            type="search"
            placeholder="Wyszukaj fiszki"
            className="w-64 border border-neutral-200 rounded-full px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="space-y-3">
          {decks.docs.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-2xl p-6 text-center text-sm text-neutral-400">
              Brak zestawów. <Link href="/decks" className="text-blue-600">Utwórz nowy</Link>.
            </div>
          ) : (
            decks.docs.map(deck => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="block bg-white border border-neutral-200 rounded-2xl px-5 py-4 hover:border-blue-300 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{deck.name}</p>
                    {deck.description && <p className="text-sm text-neutral-400 mt-1">{deck.description}</p>}
                  </div>
                  <span className="text-xs text-neutral-400">Zestaw</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
