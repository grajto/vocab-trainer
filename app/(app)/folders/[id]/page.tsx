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
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FolderOpen size={30} />
            </span>
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-slate-800">{folder.name}</h1>
              <p className="mt-1 text-sm text-slate-500">Zestaw fiszek • {cardResult.totalDocs} pojęcia • przez Ciebie</p>
            </div>
          </div>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <MoreHorizontal size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Wszystkie</button>
          <Link href="/create" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200">
            <Plus size={18} />
          </Link>
        </div>

        <div className="grid items-center gap-3 lg:grid-cols-[1fr_360px]">
          <p className="text-lg text-slate-600">Wg daty</p>
          <div className="relative">
            <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input readOnly value="" placeholder="Przeszukaj ten folder" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base text-slate-700 placeholder:text-slate-400" />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        {decks.docs.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Brak zestawów w folderze.</div>
        ) : (
          decks.docs.map((deck: any) => (
            <Link key={deck.id} href={`/decks/${deck.id}`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#e8f4ff] text-[#2b74c9]">📘</span>
                <div>
                  <p className="text-lg font-semibold text-slate-800">{deck.name}</p>
                  <p className="text-sm text-slate-500">Zestaw fiszek • {cardsByDeck.get(String(deck.id)) || 0} pojęć • przez Ciebie</p>
                </div>
              </div>
              <span className="text-slate-400">•••</span>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
