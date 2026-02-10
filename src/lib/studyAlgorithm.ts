/**
 * Study recommendation algorithm
 * Selects decks to study based on various factors:
 * - Last studied date (prioritize older decks)
 * - Success rate (prioritize decks with lower mastery)
 * - Deck size (prefer decks with enough but not too many cards)
 */

type Deck = {
  id: string
  name: string
  cardCount: number
  updatedAt: string
}

type Session = {
  deck: string
  startedAt: string
  completedCount: number
  targetCount: number
  mode: string
}

export type QuickSuggestion = {
  deckId: string
  name: string
  cardCount: number
  mode: 'translate' | 'abcd' | 'sentence'
  reason: string
}

const MODES = ['translate', 'abcd', 'sentence'] as const

/**
 * Calculate a priority score for each deck
 * Higher score = higher priority
 */
function calculatePriority(
  deck: Deck,
  recentSessions: Session[],
  now: Date
): number {
  let score = 0

  // Factor 1: Time since last study (0-40 points)
  const deckSessions = recentSessions.filter(s => String(s.deck) === deck.id)
  if (deckSessions.length === 0) {
    score += 40 // Never studied = high priority
  } else {
    const lastSession = deckSessions[0]
    const daysSince = Math.floor((now.getTime() - new Date(lastSession.startedAt).getTime()) / (1000 * 60 * 60 * 24))
    score += Math.min(40, daysSince * 5) // 5 points per day, max 40
  }

  // Factor 2: Deck size (0-30 points) - prefer medium-sized decks
  const cardCount = deck.cardCount
  if (cardCount >= 10 && cardCount <= 50) {
    score += 30 // Sweet spot
  } else if (cardCount > 50 && cardCount <= 100) {
    score += 20
  } else if (cardCount < 10) {
    score += 10 // Too small
  } else {
    score += 5 // Too large
  }

  // Factor 3: Success rate (0-30 points) - lower success = higher priority
  if (deckSessions.length > 0) {
    const totalCompleted = deckSessions.reduce((sum, s) => sum + (s.completedCount || 0), 0)
    const totalTarget = deckSessions.reduce((sum, s) => sum + (s.targetCount || 0), 0)
    const successRate = totalTarget > 0 ? totalCompleted / totalTarget : 1
    score += Math.round((1 - successRate) * 30) // Lower success = more points
  }

  return score
}

/**
 * Get 3 quick study suggestions
 * Each suggestion has max 15 words and random mode
 */
export function getQuickSuggestions(
  decks: Deck[],
  recentSessions: Session[],
  maxSuggestions: number = 3
): QuickSuggestion[] {
  if (decks.length === 0) return []

  const now = new Date()

  // Score all decks
  const scoredDecks = decks
    .filter(d => d.cardCount >= 5) // Must have at least 5 cards
    .map(deck => ({
      deck,
      score: calculatePriority(deck, recentSessions, now)
    }))
    .sort((a, b) => b.score - a.score)

  // Take top suggestions
  const suggestions: QuickSuggestion[] = []
  
  for (let i = 0; i < Math.min(maxSuggestions, scoredDecks.length); i++) {
    const { deck } = scoredDecks[i]
    
    // Random mode selection
    const mode = MODES[Math.floor(Math.random() * MODES.length)]
    
    // Determine reason
    let reason = 'Polecane do nauki'
    const deckSessions = recentSessions.filter(s => String(s.deck) === deck.id)
    
    if (deckSessions.length === 0) {
      reason = 'Nigdy nie ćwiczony'
    } else {
      const lastSession = deckSessions[0]
      const daysSince = Math.floor((now.getTime() - new Date(lastSession.startedAt).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince >= 7) {
        reason = `Ostatnio ${daysSince} dni temu`
      } else if (daysSince >= 1) {
        reason = `Ostatnio ${daysSince} ${daysSince === 1 ? 'dzień' : 'dni'} temu`
      } else {
        reason = 'Utrwal swoją wiedzę'
      }
    }

    suggestions.push({
      deckId: deck.id,
      name: deck.name,
      cardCount: Math.min(15, deck.cardCount), // Max 15 words
      mode,
      reason
    })
  }

  return suggestions
}
