import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { SetsListPage } from '@/src/page-views/SetsListPage'

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
        limit: 5000,
        depth: 0,
      })
    }
  } catch (err) {
    console.error('Decks page data fetch error:', err)
  }

  const cardCountByDeck = new Map<string, number>()
  for (const card of cards.docs) {
    const deckId = String(card.deck)
    cardCountByDeck.set(deckId, (cardCountByDeck.get(deckId) || 0) + 1)
  }

  const sets = decks.docs.map((deck: any) => ({
    id: String(deck.id),
    name: deck.name,
    cardCount: cardCountByDeck.get(String(deck.id)) || 0,
    updatedLabel: new Date(deck.updatedAt || deck.createdAt || Date.now()).toLocaleDateString('pl-PL'),
  }))

  return <SetsListPage sets={sets} />
}
