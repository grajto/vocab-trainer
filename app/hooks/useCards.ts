'use client'

import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'

export type Card = {
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

export type CardsResponse = {
  cards: Card[]
  totalCount: number
  hasMore: boolean
  nextOffset: number | null
}

export type UseCardsOptions = {
  deckId?: string | number
  folderId?: string | number
  limit?: number
  offset?: number
  dueOnly?: boolean
  enabled?: boolean
}

/**
 * Fetch cards from the API with caching and pagination
 */
async function fetchCards(options: UseCardsOptions): Promise<CardsResponse> {
  const params = new URLSearchParams()
  
  if (options.deckId) params.set('deckId', String(options.deckId))
  if (options.folderId) params.set('folderId', String(options.folderId))
  if (options.limit) params.set('limit', String(options.limit))
  if (options.offset) params.set('offset', String(options.offset))
  if (options.dueOnly) params.set('dueOnly', 'true')

  const response = await fetch(`/api/cards?${params.toString()}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Hook for fetching cards with React Query
 * 
 * Features:
 * - Automatic caching (5 minute stale time)
 * - Background refetching
 * - Pagination support
 * - Prefetching capability
 * 
 * @example
 * const { data, isLoading, error } = useCards({ deckId: '123', limit: 50 })
 */
export function useCards(options: UseCardsOptions = {}): UseQueryResult<CardsResponse> {
  const queryKey = ['cards', options]
  
  return useQuery({
    queryKey,
    queryFn: () => fetchCards(options),
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  })
}

/**
 * Hook for prefetching cards on hover or anticipation
 * 
 * @example
 * const prefetchCards = usePrefetchCards()
 * 
 * <button onMouseEnter={() => prefetchCards({ deckId: '123' })}>
 *   View Deck
 * </button>
 */
export function usePrefetchCards() {
  const queryClient = useQueryClient()

  return (options: UseCardsOptions) => {
    const queryKey = ['cards', options]
    
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchCards(options),
      staleTime: 5 * 60 * 1000,
    })
  }
}

/**
 * Hook for due cards count (optimized endpoint)
 */
export function useDueCardsCount(options: Omit<UseCardsOptions, 'limit' | 'offset'> = {}) {
  return useCards({
    ...options,
    dueOnly: true,
    limit: 1, // Just get count, not full data
  })
}

/**
 * Hook for invalidating cards cache after mutations
 * 
 * @example
 * const invalidateCards = useInvalidateCards()
 * 
 * // After creating a card
 * await createCard(newCard)
 * invalidateCards({ deckId: '123' })
 */
export function useInvalidateCards() {
  const queryClient = useQueryClient()

  return (options: UseCardsOptions = {}) => {
    // Invalidate specific query or all cards queries
    if (Object.keys(options).length > 0) {
      queryClient.invalidateQueries({ queryKey: ['cards', options] })
    } else {
      queryClient.invalidateQueries({ queryKey: ['cards'] })
    }
  }
}
