// Level intervals in days
const LEVEL_INTERVALS: Record<number, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 21,
}

function isSameDay(d1: Date | string | null | undefined, d2: Date): boolean {
  if (!d1) return false
  const a = new Date(d1)
  return a.getFullYear() === d2.getFullYear() &&
    a.getMonth() === d2.getMonth() &&
    a.getDate() === d2.getDate()
}

export function computeDueAt(level: number): string {
  const days = LEVEL_INTERVALS[level] || 1
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

// Lazy reset: if lastReviewedAt is not today, reset todayCounts
export function lazyResetToday(state: {
  lastReviewedAt?: string | null
  todayCorrectCount: number
  todayWrongCount: number
}): { todayCorrectCount: number; todayWrongCount: number } {
  const now = new Date()
  if (!isSameDay(state.lastReviewedAt, now)) {
    return { todayCorrectCount: 0, todayWrongCount: 0 }
  }
  return { todayCorrectCount: state.todayCorrectCount, todayWrongCount: state.todayWrongCount }
}

export function processCorrectAnswer(state: {
  level: number
  totalCorrect: number
  totalWrong: number
  todayCorrectCount: number
  todayWrongCount: number
  lastLevelUpAt?: string | null
  lastReviewedAt?: string | null
}): {
  level: number
  totalCorrect: number
  todayCorrectCount: number
  todayWrongCount: number
  lastReviewedAt: string
  dueAt: string
  lastLevelUpAt?: string
} {
  const now = new Date()
  const { todayCorrectCount: resetCorrect, todayWrongCount: resetWrong } = lazyResetToday(state)

  const newTodayCorrect = resetCorrect + 1
  const newTotalCorrect = state.totalCorrect + 1
  let newLevel = state.level
  let newLastLevelUpAt = state.lastLevelUpAt || undefined

  // Level up conditions: todayCorrectCount >= 2 AND lastLevelUpAt not today
  if (newTodayCorrect >= 2 && !isSameDay(state.lastLevelUpAt, now)) {
    newLevel = Math.min(state.level + 1, 4)
    if (newLevel !== state.level) {
      newLastLevelUpAt = now.toISOString()
    }
  }

  return {
    level: newLevel,
    totalCorrect: newTotalCorrect,
    todayCorrectCount: newTodayCorrect,
    todayWrongCount: resetWrong,
    lastReviewedAt: now.toISOString(),
    dueAt: computeDueAt(newLevel),
    lastLevelUpAt: newLastLevelUpAt,
  }
}

export function processWrongAnswer(state: {
  level: number
  totalWrong: number
  todayCorrectCount: number
  todayWrongCount: number
  lastReviewedAt?: string | null
}): {
  level: number
  totalWrong: number
  todayCorrectCount: number
  todayWrongCount: number
  lastReviewedAt: string
  dueAt: string
} {
  const { todayCorrectCount: resetCorrect, todayWrongCount: resetWrong } = lazyResetToday(state)
  const newTodayWrong = resetWrong + 1
  const newTotalWrong = state.totalWrong + 1

  let newLevel = Math.max(state.level - 1, 1)
  // If 2+ wrong today, drop to level 1
  if (newTodayWrong >= 2) {
    newLevel = 1
  }

  return {
    level: newLevel,
    totalWrong: newTotalWrong,
    todayCorrectCount: resetCorrect,
    todayWrongCount: newTodayWrong,
    lastReviewedAt: new Date().toISOString(),
    dueAt: computeDueAt(newLevel),
  }
}

// Card selection algorithm for a session
export interface CardForSession {
  cardId: string | number
  front: string
  back: string
  reviewStateId?: string | number
  level?: number
  todayWrongCount?: number
  lastReviewedAt?: string | null
}

export function selectCardsForSession(
  cardsWithState: CardForSession[],
  cardsWithoutState: CardForSession[],
  targetCount: number,
  maxNewPerDay: number = 20,
  alreadyIntroducedToday: number = 0,
): CardForSession[] {
  // Sort cards with review state: lower level first, higher todayWrongCount first, older lastReviewedAt first
  const sorted = [...cardsWithState].sort((a, b) => {
    const levelDiff = (a.level || 1) - (b.level || 1)
    if (levelDiff !== 0) return levelDiff
    const wrongDiff = (b.todayWrongCount || 0) - (a.todayWrongCount || 0)
    if (wrongDiff !== 0) return wrongDiff
    const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0
    const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0
    return aTime - bTime
  })

  const selected: CardForSession[] = []
  const usedIds = new Set<string | number>()

  // A) Pick from existing review states
  for (const card of sorted) {
    if (selected.length >= targetCount) break
    if (!usedIds.has(card.cardId)) {
      selected.push(card)
      usedIds.add(card.cardId)
    }
  }

  // B) Introduce new cards if needed
  let newIntroduced = alreadyIntroducedToday
  for (const card of cardsWithoutState) {
    if (selected.length >= targetCount) break
    if (newIntroduced >= maxNewPerDay) break
    if (!usedIds.has(card.cardId)) {
      selected.push(card)
      usedIds.add(card.cardId)
      newIntroduced++
    }
  }

  return selected
}
