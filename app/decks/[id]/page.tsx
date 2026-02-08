import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Vocab Trainer</Link>
          <Link href="/decks" className="text-sm text-neutral-400 hover:text-neutral-900 transition-colors">← Decks</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{deck.name}</h2>
          {deck.description && <p className="text-sm text-neutral-400 mt-1">{deck.description}</p>}
          <p className="text-xs text-neutral-400 mt-1">{cards.totalDocs} card{cards.totalDocs !== 1 ? 's' : ''}</p>
        </div>

        <AddCardForm deckId={id} />

        <div className="space-y-1">
          {cards.docs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No cards yet. Add one above.</p>
          ) : (
            cards.docs.map(card => (
              <div key={card.id} className="bg-white border border-neutral-200 rounded-lg px-4 py-3 flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium">{card.front}</span>
                  <span className="text-neutral-300 mx-2">→</span>
                  <span className="text-neutral-600">{card.back}</span>
                </div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wide">{card.cardType}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
