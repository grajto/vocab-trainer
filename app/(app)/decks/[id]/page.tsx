import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'
import { DeckStudyLauncher } from './DeckStudyLauncher'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cards: any = { totalDocs: 0, docs: [] }
  try {
    cards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: id }, owner: { equals: user.id } },
      sort: '-createdAt',
      limit: 200,
      depth: 0,
    })
  } catch (err) {
    console.error('Deck detail data fetch error:', err)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{deck.name}</h2>
          {deck.description && <p className="text-sm text-slate-400 mt-1">{deck.description}</p>}
          <p className="text-xs text-slate-400 mt-1">{cards.totalDocs} card{cards.totalDocs !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/decks" prefetch={true} className="text-sm text-slate-400 hover:text-blue-600 transition-colors">← Decks</Link>
      </div>

      {/* Study launcher with mode tiles + settings */}
      {cards.totalDocs > 0 && (
        <DeckStudyLauncher deckId={id} cardCount={cards.totalDocs} />
      )}

      <AddCardForm deckId={id} />

      {/* Card preview - simple flashcard-like view */}
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">All cards</p>
        </div>
        {cards.docs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No cards yet. Add one above.</p>
        ) : (
          cards.docs.map((card: any) => (
            <div key={card.id} className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium text-slate-900">{card.front}</span>
                <span className="text-blue-300 mx-2">→</span>
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
    </div>
  )
}
