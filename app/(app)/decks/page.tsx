import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
export const dynamic = 'force-dynamic'

export default async function DecksPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decks: any = { docs: [], totalDocs: 0 }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cards: any = { docs: [] }
  try {
    decks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 100,
      depth: 0,
    })
    if (decks.docs.length > 0) {
      cards = await payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } },
        limit: 2000,
        depth: 0,
      })
    }
  } catch (err) {
    console.error('Decks page data fetch error (migration may be pending):', err)
  }

  const cardCountByDeck = new Map<string, number>()
  for (const card of cards.docs) {
    const deckId = String(card.deck)
    cardCountByDeck.set(deckId, (cardCountByDeck.get(deckId) || 0) + 1)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Decki</h2>
        <Link href="/create" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Utwórz zestaw</Link>
      </div>

      <div className="space-y-2">
        {decks.docs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Brak zestawów. Utwórz pierwszy.</p>
        ) : (
          decks.docs.map((deck: any) => (
            <Link key={deck.id} href={`/decks/${deck.id}`} prefetch={true} className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
              <p className="font-medium text-slate-900">{deck.name}</p>
              <p className="text-xs text-slate-400 mt-1">
                {cardCountByDeck.get(String(deck.id)) || 0} kart · {new Date(deck.createdAt || new Date()).toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
