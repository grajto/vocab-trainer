import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'
import { AppShell } from '../../ui/AppShell'
import { StartSessionForm } from '../../learn/StartSessionForm'

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
    <AppShell userLabel={user.username || user.email} activePath="/library">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">{deck.name}</h2>
            {deck.description && <p className="text-sm text-neutral-400 mt-1">{deck.description}</p>}
            <p className="text-xs text-neutral-400 mt-1">{cards.totalDocs} card{cards.totalDocs !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/library" className="text-sm text-neutral-500 hover:text-neutral-900">← Twoje zasoby</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {['Fiszki', 'Ucz się', 'Test', 'Zdania'].map(mode => (
            <div key={mode} className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-sm font-medium text-neutral-700">
              {mode}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1.2fr,1fr] gap-6">
          <div>
            <AddCardForm deckId={id} />
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-lg font-semibold">Szybkie ustawienia sesji</h3>
            <StartSessionForm decks={[{ id: String(deck.id), name: deck.name }]} />
          </div>
        </div>

        <div className="space-y-1">
          {cards.docs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No cards yet. Add one above.</p>
          ) : (
            cards.docs.map(card => (
              <div key={card.id} className="bg-white border border-neutral-200 rounded-xl px-4 py-3 flex justify-between items-center">
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
      </div>
    </AppShell>
  )
}
