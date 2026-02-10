/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { Bookmark, ChevronRight, MoreHorizontal, Pencil, Share2, Star, Volume2 } from 'lucide-react'
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
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}>
        <Link href={deck.folder ? `/folders/${deck.folder}` : '/library'} className="hover:underline">
          {folderName}
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text)' }}>{deck.name}</span>
      </nav>

      {/* Title + actions */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>{deck.name}</h1>
        <div className="flex items-center gap-1.5">
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:bg-[var(--hover-bg)]" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <Bookmark size={14} /> Zapisz
          </button>
          <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:bg-[var(--hover-bg)]" style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}>
            <Share2 size={14} /> Udostępnij
          </button>
          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--hover-bg)]" style={{ color: 'var(--gray400)' }}>
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Mode tiles + controls */}
      <DeckStudyLauncher deckId={id} cardCount={cards.totalDocs} />

      {/* Flashcard preview */}
      <section className="rounded-lg p-5" style={{ border: '1px solid var(--border)' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>Podgląd fiszki</p>
          <div className="flex items-center gap-3" style={{ color: 'var(--gray400)' }}>
            <button type="button" className="hover:opacity-70"><Pencil size={14} /></button>
            <button type="button" className="hover:opacity-70"><Volume2 size={14} /></button>
            <button type="button" className="hover:opacity-70"><Star size={14} /></button>
          </div>
        </div>
        <div
          className="flex min-h-[200px] items-center justify-center rounded-lg p-8 text-center text-3xl font-semibold"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          {firstCard ? firstCard.front : 'Brak kart w zestawie'}
        </div>
        <p className="mt-3 text-center text-xs font-medium" style={{ color: 'var(--muted)' }}>
          {cards.totalDocs > 0 ? `1 / ${cards.totalDocs}` : '0 / 0'}
        </p>
      </section>

      {/* Terms list */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
          Pojęcia w tym zestawie ({cards.totalDocs})
        </h2>

        {cards.docs.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>Brak kart. Dodaj pierwszą kartę poniżej.</p>
        ) : (
          <div className="space-y-1">
            {cards.docs.map((card: any) => (
              <div
                key={card.id}
                className="flex items-center gap-4 rounded-lg px-4 py-3"
                style={{ border: '1px solid var(--border)' }}
              >
                <div className="grid flex-1 grid-cols-2 gap-4">
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{card.front}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{card.back}</p>
                </div>
                <div className="flex items-center gap-2" style={{ color: 'var(--gray400)' }}>
                  <button type="button" className="hover:opacity-70" aria-label="Ulubione"><Star size={14} /></button>
                  <button type="button" className="hover:opacity-70" aria-label="Dźwięk"><Volume2 size={14} /></button>
                  <button type="button" className="hover:opacity-70" aria-label="Edytuj"><Pencil size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add card form */}
      <section>
        <AddCardForm deckId={id} />
      </section>
    </div>
  )
}
