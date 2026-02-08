import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'

export default async function DeckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  
  let deck
  try {
    deck = await payload.findByID({ collection: 'decks', id, depth: 0 })
  } catch {
    notFound()
  }

  if (String(deck.owner) !== String(user.id)) notFound()

  const cards = await payload.find({
    collection: 'cards',
    where: { deck: { equals: id }, owner: { equals: user.id } },
    sort: '-createdAt',
    limit: 200,
    depth: 0,
  })

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">Vocab Trainer</Link>
        <Link href="/decks" className="text-gray-600 hover:text-black">← Back to Decks</Link>
      </nav>
      <main className="max-w-2xl mx-auto p-4 mt-6 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{deck.name}</h2>
          {deck.description && <p className="text-gray-500 mt-1">{deck.description}</p>}
          <p className="text-sm text-gray-400 mt-1">{cards.totalDocs} cards</p>
        </div>

        <AddCardForm deckId={id} />

        <div className="space-y-2">
          {cards.docs.length === 0 ? (
            <p className="text-gray-500">No cards yet. Add one above.</p>
          ) : (
            cards.docs.map(card => (
              <div key={card.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                <div>
                  <span className="font-medium">{card.front}</span>
                  <span className="text-gray-400 mx-2">→</span>
                  <span>{card.back}</span>
                </div>
                <span className="text-xs text-gray-400 capitalize">{card.cardType}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
