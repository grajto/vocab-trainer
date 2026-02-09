import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'

export const dynamic = 'force-dynamic'

export default async function FoldersPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let folders: any = { docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decks: any = { docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cards: any = { docs: [] }

  try {
    const results = await Promise.all([
      payload.find({
        collection: 'folders',
        where: { owner: { equals: user.id } },
        sort: '-createdAt',
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        limit: 200,
        depth: 0,
      }),
    ])
    folders = results[0]
    decks = results[1]
    if (decks.docs.length > 0) {
      cards = await payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } },
        limit: 2000,
        depth: 0,
      })
    }
  } catch (err) {
    console.error('Folders page data fetch error (migration may be pending):', err)
  }

  const cardsByDeck = new Map<string, number>()
  for (const card of cards.docs) {
    const deckId = String(card.deck)
    cardsByDeck.set(deckId, (cardsByDeck.get(deckId) || 0) + 1)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Foldery</h2>
        <Link href="/library?tab=folders&create=true" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Utwórz folder</Link>
      </div>
      <div className="space-y-2">
        {folders.docs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Brak folderów.</p>
        ) : (
          folders.docs.map((folder: any) => {
            const folderDecks = decks.docs.filter((d: any) => String(d.folder) === String(folder.id))
            const cardCount = folderDecks.reduce((sum: number, d: any) => sum + (cardsByDeck.get(String(d.id)) || 0), 0)
            return (
              <Link key={folder.id} href={`/folders/${folder.id}`} prefetch={true} className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
                <p className="font-medium text-slate-900">{folder.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {cardCount} kart · {new Date(folder.createdAt || new Date()).toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
                </p>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
