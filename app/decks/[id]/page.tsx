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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-indigo-600">Home</Link>
          <Link href="/decks" className="text-sm text-slate-400 hover:text-indigo-600 transition-colors">← Decks</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">{deck.name}</h2>
          {deck.description && <p className="text-sm text-slate-400 mt-1">{deck.description}</p>}
          <p className="text-xs text-slate-400 mt-1">{cards.totalDocs} card{cards.totalDocs !== 1 ? 's' : ''}</p>
        </div>

        <AddCardForm deckId={id} />

        <div className="space-y-1">
          {cards.docs.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No cards yet. Add one above.</p>
          ) : (
            cards.docs.map(card => (
              <div key={card.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center">
                <div className="text-sm">
                  <span className="font-medium text-slate-900">{card.front}</span>
                  <span className="text-indigo-300 mx-2">→</span>
                  <span className="text-slate-600">{card.back}</span>
                </div>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
                  card.cardType === 'sentence' ? 'bg-violet-100 text-violet-600' :
                  card.cardType === 'phrase' ? 'bg-amber-100 text-amber-600' :
                  'bg-emerald-100 text-emerald-600'
                }`}>{card.cardType}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
