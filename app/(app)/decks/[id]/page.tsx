/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ChevronRight, ListChecks, SpellCheck } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { Button } from '../../_components/ui/Button'
import { AddCardForm } from './AddCardForm'
import { DeckStudyLauncher } from './DeckStudyLauncher'
import { FilterableCardsList } from './FilterableCardsList'

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
      {/* A) Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
        <Link href={deck.folder ? `/folders/${deck.folder}` : '/library'} className="hover:underline">
          {folderName}
        </Link>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text)' }}>{deck.name}</span>
      </nav>

      {/* B) Deck title */}
      <h1 className="font-bold" style={{ fontSize: '1.5rem', color: 'var(--text)' }}>
        {deck.name}
      </h1>

      {/* C) Action row */}
      <div className="flex items-center gap-2">
        <Button variant="primary">
          <SpellCheck size={16} />
          Ucz się
        </Button>
        <Button variant="secondary">
          <ListChecks size={16} />
          Test
        </Button>
      </div>

      {/* D) Content area */}
      <div className="space-y-6">
        {/* DeckStudyLauncher with mode tiles + controls */}
        <DeckStudyLauncher deckId={id} cardCount={cards.totalDocs} />

        {/* Filterable cards list */}
        <FilterableCardsList cards={cards.docs} />

        {/* Add card form */}
        <AddCardForm deckId={id} />
      </div>
    </div>
  )
}
