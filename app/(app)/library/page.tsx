/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { LibraryTabs } from './LibraryTabs'
import { Library, Plus } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '../_components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  let decks: any = { docs: [] }
  let folders: any = { docs: [] }
  let cards: any = { docs: [] }
  let reviewStates: any = { docs: [] }
  let recentSessions: any = { docs: [] }

  try {
    const results = await Promise.all([
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        sort: '-updatedAt',
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'folders',
        where: { owner: { equals: user.id } },
        sort: 'name',
        limit: 100,
        depth: 0,
      }),
      // Fetch recent sessions to determine last used
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id }, endedAt: { not_equals: null } },
        sort: '-startedAt',
        limit: 500,
        depth: 0,
      }),
    ])
    decks = results[0]
    folders = results[1]
    recentSessions = results[2]
    
    if (decks.docs.length > 0) {
      cards = await payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } },
        limit: 2000,
        depth: 0,
      })
      if (cards.docs.length > 0) {
        reviewStates = await payload.find({
          collection: 'review-states',
          where: { owner: { equals: user.id }, card: { in: cards.docs.map((c: any) => c.id) } },
          limit: 2000,
          depth: 0,
        })
      }
    }
  } catch (err) {
    console.error('Library page data fetch error (migration may be pending):', err)
  }

  const cardCountByDeck = new Map<string, number>()
  for (const card of cards.docs) {
    const deckId = String(card.deck)
    cardCountByDeck.set(deckId, (cardCountByDeck.get(deckId) || 0) + 1)
  }

  // Build map of last used timestamps for decks
  const lastUsedByDeck = new Map<string, string>()
  for (const session of recentSessions.docs) {
    const deckId = String(session.deck)
    if (!lastUsedByDeck.has(deckId) && session.startedAt) {
      lastUsedByDeck.set(deckId, session.startedAt)
    }
  }

  const level4ByDeck = new Map<string, number>()
  const totalByDeck = new Map<string, number>()
  const cardDeckMap = new Map<string, string>()
  for (const card of cards.docs) cardDeckMap.set(String(card.id), String(card.deck))
  for (const rs of reviewStates.docs) {
    const deckId = cardDeckMap.get(String(rs.card))
    if (!deckId) continue
    totalByDeck.set(deckId, (totalByDeck.get(deckId) || 0) + 1)
    if (rs.level === 4) level4ByDeck.set(deckId, (level4ByDeck.get(deckId) || 0) + 1)
  }

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)', paddingTop: '32px' }}>
      <PageHeader
        icon={Library}
        title="Twoje zasoby"
        subtitle="Zestawy i foldery w jednym miejscu"
        action={
          <>
            <Link
              href="/folders?create=true"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors hover:opacity-90"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            >
              <Plus size={16} /> Dodaj folder
            </Link>
            <Link
              href="/create"
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors hover:opacity-90"
              style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
            >
              <Plus size={16} /> Dodaj zestaw
            </Link>
          </>
        }
      />

      <LibraryTabs
        decks={decks.docs.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          cardCount: cardCountByDeck.get(String(d.id)) || 0,
          author: '',
          createdAt: new Date(d.createdAt || d.updatedAt || new Date()).toLocaleString('pl-PL', { month: 'long', year: 'numeric' }),
          lastUsed: lastUsedByDeck.get(String(d.id)) || null,
        }))}
        folders={folders.docs.map((f: any) => {
          const folderDecks = decks.docs.filter((d: any) => String(d.folder) === String(f.id))
          const totalCards = folderDecks.reduce((sum: number, d: any) => sum + (cardCountByDeck.get(String(d.id)) || 0), 0)
          const masteryAvg = folderDecks.length > 0
            ? Math.round(folderDecks.reduce((sum: number, d: any) => {
              const total = totalByDeck.get(String(d.id)) || 0
              const l4 = level4ByDeck.get(String(d.id)) || 0
              return sum + (total > 0 ? Math.round((l4 / total) * 100) : 0)
            }, 0) / folderDecks.length)
            : 0

          return {
            id: String(f.id),
            name: f.name,
            deckCount: folderDecks.length,
            cardCount: totalCards,
            mastery: masteryAvg,
          }
        })}
      />
    </div>
  )
}
