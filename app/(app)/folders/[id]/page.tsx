import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { FolderOpen } from 'lucide-react'

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

  // Count cards across all decks
  let totalCards = 0
  let totalDue = 0
  const now = new Date().toISOString()

  if (decks.docs.length > 0) {
    const deckIds = decks.docs.map(d => d.id)
    const [cardCount, dueCount] = await Promise.all([
      payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id }, deck: { in: deckIds } },
        limit: 0,
        depth: 0,
      }),
      payload.find({
        collection: 'review-states',
        where: {
          owner: { equals: user.id },
          dueAt: { less_than_equal: now },
        },
        limit: 0,
        depth: 0,
      }),
    ])
    totalCards = cardCount.totalDocs
    totalDue = dueCount.totalDocs
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
        <Link
          href={`/learn?folder=${id}`}
          prefetch={true}
          className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-violet-700 transition-all shadow-sm"
        >
          Learn from folder
        </Link>
      )}

      {/* Decks list */}
      <div className="space-y-2">
        {decks.docs.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
            <p className="text-sm text-slate-400 mb-2">No decks in this folder yet.</p>
            <p className="text-xs text-slate-400">Assign decks to this folder from the deck settings.</p>
          </div>
        ) : (
          decks.docs.map(deck => (
            <Link
              key={deck.id}
              href={`/decks/${deck.id}`}
              prefetch={true}
              className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all"
            >
              <p className="font-medium text-slate-900">{deck.name}</p>
              {deck.description && <p className="text-sm text-slate-400 mt-0.5">{deck.description}</p>}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
