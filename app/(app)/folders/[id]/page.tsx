/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { BookOpen, FolderOpen, MoreHorizontal, Plus, Search } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'

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

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)' }}>
      {/* Folder header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}
          >
            <FolderOpen size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold" style={{ color: 'var(--text)' }}>{folder.name}</h1>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{cardResult.totalDocs} pojęć • przez Ciebie</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
            style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}
          >
            <Plus size={14} /> Dodaj zestaw
          </Link>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--hover-bg)]"
            style={{ color: 'var(--gray400)' }}
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--gray400)' }} />
        <input
          readOnly
          value=""
          placeholder="Przeszukaj ten folder"
          className="h-10 w-full rounded-lg pl-9 pr-4 text-sm focus:outline-none"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        />
      </div>

      {/* Deck list */}
      <div className="space-y-0.5">
        {decks.docs.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>Brak zestawów w folderze.</p>
        ) : (
          decks.docs.map((deck: any) => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--hover-bg)]"
            >
              <span
                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
                style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}
              >
                <BookOpen size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{deck.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{cardsByDeck.get(String(deck.id)) || 0} pojęć • przez Ciebie</p>
              </div>
              <button
                type="button"
                onClick={(e) => e.preventDefault()}
                className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-[var(--surface2)]"
                style={{ color: 'var(--gray400)' }}
              >
                <MoreHorizontal size={16} />
              </button>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
