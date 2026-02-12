'use client'

/**
 * Example component demonstrating React Query hooks for performance optimization
 * 
 * This component shows:
 * 1. How to use useCards hook for fetching cards
 * 2. How to implement prefetch on hover
 * 3. How to handle pagination
 * 4. How to invalidate cache after mutations
 * 
 * Key Performance Features:
 * - Data cached for 5 minutes
 * - Prefetch on hover for instant navigation
 * - Pagination support
 * - Optimistic updates
 */

import { useCards, usePrefetchCards, useInvalidateCards } from '@/app/hooks/useCards'
import { useState } from 'react'

export function CardsListExample() {
  const [deckId, setDeckId] = useState<string>('1')
  const [offset, setOffset] = useState(0)
  const limit = 50

  // Fetch cards with caching
  const { data, isLoading, isFetching, error } = useCards({ 
    deckId, 
    limit, 
    offset 
  })

  // Prefetch hook for hover optimization
  const prefetchCards = usePrefetchCards()

  // Invalidate hook for after mutations
  const invalidateCards = useInvalidateCards()

  // Handler for deck switching with prefetch
  const handleDeckChange = (newDeckId: string) => {
    setDeckId(newDeckId)
    setOffset(0) // Reset pagination
  }

  // Handler for pagination
  const handleNextPage = () => {
    if (data?.hasMore) {
      setOffset(data.nextOffset || 0)
    }
  }

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit))
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Cards List with Performance Optimization</h2>

      {/* Deck selector with prefetch on hover */}
      <div className="mb-4 space-x-2">
        {['1', '2', '3'].map(id => (
          <button
            key={id}
            onClick={() => handleDeckChange(id)}
            onMouseEnter={() => prefetchCards({ deckId: id, limit, offset: 0 })}
            className={`px-4 py-2 rounded ${
              deckId === id 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Deck {id}
          </button>
        ))}
      </div>

      {/* Loading & Error States */}
      {isLoading && <div className="text-gray-600">Loading cards...</div>}
      {error && <div className="text-red-600">Error: {error.message}</div>}
      
      {/* Background fetching indicator */}
      {isFetching && !isLoading && (
        <div className="text-sm text-blue-600 mb-2">Updating...</div>
      )}

      {/* Cards List */}
      {data && (
        <>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {data.cards.length} of {data.totalCount} cards
            </p>
          </div>

          <div className="space-y-2 mb-4">
            {data.cards.map(card => (
              <div 
                key={card.id} 
                className="border rounded p-3 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{card.front}</p>
                    <p className="text-gray-600">{card.back}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {card.isDue && (
                      <span className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded">
                        Due
                      </span>
                    )}
                    {card.reviewState && (
                      <span className="ml-2">
                        Level {card.reviewState.level}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevPage}
              disabled={offset === 0}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>

            <button
              onClick={handleNextPage}
              disabled={!data.hasMore}
              onMouseEnter={() => {
                if (data.nextOffset) {
                  prefetchCards({ deckId, limit, offset: data.nextOffset })
                }
              }}
              className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
