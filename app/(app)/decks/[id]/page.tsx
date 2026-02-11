/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, ChevronRight, Edit, Plus } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AddCardForm } from './AddCardForm'
import { FilterableCardsList } from './FilterableCardsList'
import { QuickModeButtons } from './QuickModeButtons'

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

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link href={deck.folder ? `/folders/${deck.folder}` : '/library'} className="hover:underline">
          {folderName}
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text)' }}>{deck.name}</span>
      </nav>

      {/* Deck header - matching folder page style */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <BookOpen size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold" style={{ color: 'var(--text)' }}>
              {deck.name}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {cards.totalDocs} pojęć
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/decks/${id}/edit`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--surface-muted)', color: 'var(--text)' }}
          >
            <Edit size={14} /> Edytuj
          </Link>
        </div>
      </div>

      {/* Quick mode buttons - 6 modes */}
      <QuickModeButtons deckId={id} cardCount={cards.totalDocs} />

      {/* Filterable cards list */}
      <FilterableCardsList cards={cards.docs} deckId={id} />

      {/* Add card form */}
      <AddCardForm deckId={id} />
    </div>
  )
}
