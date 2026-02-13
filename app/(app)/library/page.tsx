/* eslint-disable @typescript-eslint/no-explicit-any */
import { FolderOpen } from 'lucide-react'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { PageContainer } from '../_components/PageContainer'
import { PageHeader } from '../_components/PageHeader'
import { LibraryTabs } from './LibraryTabs'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  let decks: any = { docs: [] }
  let folders: any = { docs: [] }
  let cards: any = { docs: [] }
  let reviewStates: any = { docs: [] }
  let sessions: any = { docs: [] }

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
        sort: '-updatedAt',
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id } },
        sort: '-startedAt',
        limit: 50,
        depth: 0,
      }),
    ])

    decks = results[0]
    folders = results[1]
    sessions = results[2]

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

  const deckFolderMap = new Map<string, string>()
  for (const deck of decks.docs) {
    if (deck.folder) deckFolderMap.set(String(deck.id), String(deck.folder))
  }

  let recentDeckId: string | null = null
  let recentFolderId: string | null = null

  for (const session of sessions.docs) {
    const sid = String(session.deck || '')
    if (!sid) continue
    if (!recentDeckId) recentDeckId = sid
    const folderId = deckFolderMap.get(sid)
    if (!recentFolderId && folderId) recentFolderId = folderId
    if (recentDeckId && recentFolderId) break
  }

  return (
    <PageContainer>
      <PageHeader title="Twoje zasoby" icon={FolderOpen} />

      <LibraryTabs
        recentDeckId={recentDeckId}
        recentFolderId={recentFolderId}
        decks={decks.docs.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          cardCount: cardCountByDeck.get(String(d.id)) || 0,
          author: '',
          createdAt: new Date(d.createdAt || d.updatedAt || new Date()).toLocaleString('pl-PL', { month: 'long', year: 'numeric' }),
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
    </PageContainer>
  )
}
