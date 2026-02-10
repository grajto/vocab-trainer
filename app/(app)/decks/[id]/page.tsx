/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'
import { Card } from '@/app/(app)/_components/ui/Card'
import { SectionHeader } from '@/app/(app)/_components/ui/SectionHeader'
import { Button } from '@/app/(app)/_components/ui/Button'

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

  let cards: any = { totalDocs: 0, docs: [] }
  try {
    cards = await payload.find({ collection: 'cards', where: { deck: { equals: id }, owner: { equals: user.id } }, sort: '-createdAt', limit: 200, depth: 0 })
  } catch (err) {
    console.error('Deck detail data fetch error:', err)
  }

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <Card>
        <SectionHeader
          title={deck.name}
          description={`${cards.totalDocs} terms${deck.description ? ` • ${deck.description}` : ''}`}
          action={
            <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap' }}>
              <Link href={`/study?deck=${id}`}><Button>Learn</Button></Link>
              <Link href={`/study?deck=${id}&mode=translate`}><Button variant="secondary">Flashcards</Button></Link>
              <Link href="/create"><Button variant="ghost">Edit</Button></Link>
            </div>
          }
        />
      </Card>

      <Card>
        <SectionHeader title="Add card" />
        <AddCardForm deckId={id} />
      </Card>

      <section>
        <SectionHeader title="Cards" />
        <div className="list">
          {cards.docs.length === 0 ? (
            <Card><p className="p-muted">No cards yet.</p></Card>
          ) : cards.docs.map((card: any) => (
            <Card key={card.id} compact>
              <div className="resource-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <p className="row__meta">Term</p>
                  <p className="row__title">{card.front}</p>
                </div>
                <div>
                  <p className="row__meta">Definition</p>
                  <p className="row__title">{card.back}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
