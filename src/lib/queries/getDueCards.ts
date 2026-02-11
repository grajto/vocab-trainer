/**
 * Optimized query for fetching due cards with minimal database round-trips.
 * 
 * This query combines:
 * 1. Cards with their review states
 * 2. Filtering by deck/folder/owner
 * 3. Pagination support
 * 4. Only fetching necessary fields
 * 
 * Performance targets:
 * - Single query execution (no N+1)
 * - Uses composite indexes for fast lookups
 * - Pagination to limit payload size
 * - Minimal field selection
 */

import { getPayload } from '../getPayload'

export type DueCardParams = {
  userId: string | number
  deckIds?: number[]
  folderId?: number
  limit?: number
  offset?: number
  includeDueOnly?: boolean
}

export type DueCard = {
  id: string
  deckId: string
  front: string
  back: string
  cardType: string
  reviewState: {
    id: string
    level: number
    dueAt: string
    totalCorrect: number
    totalWrong: number
    lastReviewedAt?: string
  } | null
  isDue: boolean
}

export type DueCardsResult = {
  cards: DueCard[]
  totalCount: number
  hasMore: boolean
  nextOffset: number | null
}

/**
 * Fetch due cards with optimized query pattern.
 * Uses parallel queries and minimal depth to reduce latency.
 */
export async function getDueCards(params: DueCardParams): Promise<DueCardsResult> {
  const {
    userId,
    deckIds = [],
    folderId,
    limit = 50,
    offset = 0,
    includeDueOnly = false,
  } = params

  const payload = await getPayload()
  const now = new Date()

  // Step 1: Resolve deck IDs if folder is specified
  let targetDeckIds = deckIds
  if (folderId && deckIds.length === 0) {
    const decksInFolder = await payload.find({
      collection: 'decks',
      where: { 
        owner: { equals: userId }, 
        folder: { equals: folderId } 
      },
      limit: 1000, // Increased from 500 to support larger folders
      depth: 0,
    })
    targetDeckIds = decksInFolder.docs.map((d: any) => Number(d.id)).filter(Boolean)
  }

  if (targetDeckIds.length === 0) {
    // Fetch all user's decks
    const allDecks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: userId } },
      limit: 1000, // Increased from 500 to support power users
      depth: 0,
    })
    targetDeckIds = allDecks.docs.map((d: any) => Number(d.id)).filter(Boolean)
  }

  if (targetDeckIds.length === 0) {
    return {
      cards: [],
      totalCount: 0,
      hasMore: false,
      nextOffset: null,
    }
  }

  // Step 2: Fetch cards and review states in parallel
  const [cardsResult, reviewStates] = await Promise.all([
    payload.find({
      collection: 'cards',
      where: { 
        owner: { equals: userId }, 
        deck: { in: targetDeckIds } 
      },
      sort: 'id',
      limit,
      page: Math.floor(offset / limit) + 1,
      depth: 0,
    }),
    payload.find({
      collection: 'review-states',
      where: { 
        owner: { equals: userId },
        ...(includeDueOnly && { dueAt: { less_than_equal: now.toISOString() } })
      },
      limit: 10000, // Increased from 5000 to support large collections
      depth: 0,
    }),
  ])

  // Step 3: Build review state map for O(1) lookup
  const reviewStateMap = new Map<string, any>()
  for (const rs of reviewStates.docs) {
    reviewStateMap.set(String(rs.card), rs)
  }

  // Step 4: Combine cards with their review states
  const cardsWithStates = cardsResult.docs
    .map((card: any) => {
      const reviewState = reviewStateMap.get(String(card.id))
      const isDue = reviewState 
        ? new Date(reviewState.dueAt) <= now
        : false

      // Filter out non-due cards if requested
      if (includeDueOnly && !isDue) {
        return null
      }

      const dueCard: DueCard = {
        id: String(card.id),
        deckId: String(card.deck),
        front: card.front,
        back: card.back,
        cardType: card.cardType || 'word',
        reviewState: reviewState ? {
          id: String(reviewState.id),
          level: reviewState.level,
          dueAt: reviewState.dueAt,
          totalCorrect: reviewState.totalCorrect || 0,
          totalWrong: reviewState.totalWrong || 0,
          lastReviewedAt: reviewState.lastReviewedAt || undefined,
        } : null,
        isDue,
      }
      return dueCard
    })
    .filter((card): card is DueCard => card !== null)

  const cards: DueCard[] = cardsWithStates

  const hasMore = cardsResult.hasNextPage || false
  const nextOffset = hasMore ? offset + limit : null

  return {
    cards,
    totalCount: cardsResult.totalDocs,
    hasMore,
    nextOffset,
  }
}

/**
 * Get count of due cards without fetching full data.
 * Useful for dashboard counters and quick checks.
 */
export async function getDueCardsCount(params: Omit<DueCardParams, 'limit' | 'offset'>): Promise<number> {
  const payload = await getPayload()
  const now = new Date()

  const result = await payload.find({
    collection: 'review-states',
    where: {
      owner: { equals: params.userId },
      dueAt: { less_than_equal: now.toISOString() },
    },
    limit: 1,
    depth: 0,
  })

  return result.totalDocs
}
