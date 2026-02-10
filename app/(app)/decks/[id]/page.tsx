import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { SetDetailPage } from '@/src/page-views/SetDetailPage'
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
  let cards: any = { docs: [] }
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

  const mappedCards = cards.docs.map((card: any) => ({ id: String(card.id), prompt: card.front, answer: card.back }))

  return (
    <div>
      <SetDetailPage title={deck.name} description={deck.description || ''} cards={mappedCards} deckId={id} />
      <div className="px-4 lg:px-8">
        {mappedCards.length > 0 && <DeckStudyLauncher deckId={id} cardCount={mappedCards.length} />}
      </div>
      <div className="px-4 pb-8 lg:px-8">
        <AddCardForm deckId={id} />
      </div>
    </div>
  )
}
