import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { FolderOpen } from 'lucide-react'
import { FolderDeckList } from './FolderDeckList'

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

  // Get decks in this folder
  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id }, folder: { equals: id } },
    sort: 'name',
    limit: 100,
    depth: 0,
  })

  const recentSessions = await payload.find({
    collection: 'sessions',
    where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } },
    sort: '-startedAt',
    limit: 200,
    depth: 0,
  })

  const lastUsedMap = new Map<string, string>()
  for (const s of recentSessions.docs) {
    const did = String(s.deck)
    if (!lastUsedMap.has(did) && s.startedAt) {
      lastUsedMap.set(did, s.startedAt)
    }
  }

  // Count cards across all decks
  let totalCards = 0
  let totalDue = 0
  const now = new Date().toISOString()

  if (decks.docs.length > 0) {
    const deckIds = decks.docs.map((d: any) => d.id)
    const cardResult = await payload.find({
      collection: 'cards',
      where: { owner: { equals: user.id }, deck: { in: deckIds } },
      limit: 1000,
      depth: 0,
    })
    totalCards = cardResult.totalDocs

    if (cardResult.docs.length > 0) {
      const cardIds = cardResult.docs.map((c: any) => c.id)
      const dueResult = await payload.find({
        collection: 'review-states',
        where: {
          owner: { equals: user.id },
          card: { in: cardIds },
          dueAt: { less_than_equal: now },
        },
        limit: 0,
        depth: 0,
      })
      totalDue = dueResult.totalDocs
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-indigo-50 rounded-xl">
          <FolderOpen className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{folder.name}</h2>
          {folder.description && <p className="text-sm text-slate-400 mt-1">{folder.description}</p>}
          <div className="flex gap-4 mt-2 text-xs text-slate-400">
            <span>{decks.docs.length} deck{decks.docs.length !== 1 ? 's' : ''}</span>
            <span>{totalCards} cards</span>
            <span className="text-amber-500 font-medium">{totalDue} due</span>
          </div>
        </div>
      </div>

      {/* Learn from folder CTA */}
      {decks.docs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/learn?folder=${id}`}
            prefetch={true}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
          >
            Ucz się
          </Link>
          <Link
            href="/decks?create=true"
            prefetch={true}
            className="flex-1 min-w-[200px] flex items-center justify-center gap-2 border border-slate-200 bg-white text-slate-700 py-3.5 rounded-xl font-medium hover:border-indigo-300 transition-all shadow-sm"
          >
            Dodaj zestaw
          </Link>
        </div>
      )}

      <FolderDeckList
        decks={decks.docs.map((deck: any) => ({
          id: String(deck.id),
          name: deck.name,
          description: deck.description || '',
          updatedAt: deck.updatedAt || '',
          lastUsed: lastUsedMap.get(String(deck.id)) || null,
        }))}
      />
    </div>
  )
}
