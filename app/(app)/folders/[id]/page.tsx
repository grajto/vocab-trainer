/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { FolderOpen, MoreHorizontal, Plus, Search } from 'lucide-react'
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
      <section className="space-y-5 rounded-[var(--radius)] p-6" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radiusSm)]" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
              <FolderOpen size={24} />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)' }}>{folder.name}</h1>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Zestaw fiszek • {cardResult.totalDocs} pojęcia • przez Ciebie</p>
            </div>
          </div>
          <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f8fafc]" style={{ color: 'var(--gray400)' }}>
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-full px-4 py-2 text-sm font-semibold" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>Wszystkie</button>
          <Link href="/create" className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f8fafc]" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
            <Plus size={18} />
          </Link>
        </div>

        <div className="grid items-center gap-3 lg:grid-cols-[1fr_360px]">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Wg daty</p>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--gray400)' }} />
            <input readOnly value="" placeholder="Przeszukaj ten folder" className="h-10 w-full rounded-full px-4 pr-12 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)' }} />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {decks.docs.length === 0 ? (
          <div className="rounded-[var(--radius)] p-6 text-sm" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}>Brak zestawów w folderze.</div>
        ) : (
          decks.docs.map((deck: any) => (
            <Link key={deck.id} href={`/decks/${deck.id}`} className="flex items-center gap-3 rounded-[var(--radiusSm)] px-4 py-3 hover:bg-[#f8fafc]" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>📘</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{deck.name}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Zestaw fiszek • {cardsByDeck.get(String(deck.id)) || 0} pojęć • przez Ciebie</p>
              </div>
              <span style={{ color: 'var(--gray400)' }}>•••</span>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
