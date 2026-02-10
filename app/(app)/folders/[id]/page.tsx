/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import { FolderOpen, Plus } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { FolderDeckList } from './FolderDeckList'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let folder
  try {
    folder = await payload.findByID({ collection: 'folders', id, depth: 0 })
  } catch {
    notFound()
  }
  if (String(folder.owner) !== String(user.id)) notFound()

  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id }, folder: { equals: id } },
    sort: '-updatedAt',
    limit: 100,
    depth: 0,
  })
  const cardResult = await payload.find({
    collection: 'cards',
    where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } },
    limit: 1000,
    depth: 0,
  })

  const cardsByDeck = new Map<string, number>()
  for (const card of cardResult.docs) cardsByDeck.set(String(card.deck), (cardsByDeck.get(String(card.deck)) || 0) + 1)

  const deckItems = decks.docs.map((d: any) => ({
    id: String(d.id),
    name: d.name,
    description: d.description || '',
    updatedAt: d.updatedAt,
    lastUsed: d.lastUsed || null,
    cardCount: cardsByDeck.get(String(d.id)) || 0,
  }))

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      {/* Folder header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <FolderOpen size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold" style={{ color: 'var(--text)' }}>
              {folder.name}
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {cardResult.totalDocs} pojęć • przez Ciebie
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors hover:opacity-90"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            <Plus size={14} /> Dodaj zestaw
          </Link>
        </div>
      </div>

      {/* Deck list with client-side filtering */}
      <FolderDeckList decks={deckItems} />
    </div>
  )
}
