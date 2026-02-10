/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Pencil, Star, Volume2 } from 'lucide-react'
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

  let deck: any
  try {
    deck = await payload.findByID({ collection: 'decks', id, depth: 0 })
  } catch {
    notFound()
  }

  if (String(deck.owner) !== String(user.id)) notFound()

  let folderName = 'Bez folderu'
  if (deck.folder) {
    try {
      const folder = await payload.findByID({ collection: 'folders', id: deck.folder, depth: 0 })
      folderName = folder.name
    } catch {
      folderName = 'Bez folderu'
    }
  }

  let cards: any = { totalDocs: 0, docs: [] }
  try {
    cards = await payload.find({
      collection: 'cards',
      where: { deck: { equals: id }, owner: { equals: user.id } },
      sort: 'createdAt',
      limit: 300,
      depth: 0,
    })
  } catch (err) {
    console.error('Deck detail data fetch error:', err)
  }

  const firstCard = cards.docs[0]

  return (
    <div className="deck-page">
      <div className="deck-header-path">
        <Link href={deck.folder ? `/folders/${deck.folder}` : '/folders'}>📁 {folderName}</Link>
      </div>

      <h1 className="deck-title">{deck.name}</h1>

      <DeckStudyLauncher deckId={id} cardCount={cards.totalDocs} />

      <section className="deck-preview">
        <div className="deck-preview__top">
          <p>Podgląd fiszki</p>
          <div className="deck-preview__icons">
            <Pencil size={15} />
            <Volume2 size={15} />
            <Star size={15} />
          </div>
        </div>

        <div className="deck-preview__card">
          {firstCard ? firstCard.front : 'Brak kart w zestawie'}
        </div>

        <div className="deck-preview__bottom">
          <span>{cards.totalDocs > 0 ? `1 / ${cards.totalDocs}` : '0 / 0'}</span>
        </div>
      </section>

      <section className="deck-terms">
        <div className="deck-terms__head">
          <h2>Liczba pojęć w tym zestawie ({cards.totalDocs})</h2>
        </div>

        {cards.docs.length === 0 ? (
          <div className="dash-empty">Brak kart. Dodaj pierwszą kartę poniżej.</div>
        ) : (
          <div className="deck-terms__list">
            {cards.docs.map((card: any) => (
              <article key={card.id} className="deck-term-row">
                <div className="deck-term-row__text">
                  <p>{card.front}</p>
                  <p>{card.back}</p>
                </div>
                <div className="deck-term-row__actions">
                  <button type="button" aria-label="Ulubione"><Star size={15} /></button>
                  <button type="button" aria-label="Dźwięk"><Volume2 size={15} /></button>
                  <button type="button" aria-label="Edytuj"><Pencil size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <AddCardForm deckId={id} />
      </section>
    </div>
  )
}
