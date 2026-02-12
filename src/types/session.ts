// Shared types for session-related data
export interface SessionDocument {
  id: string
  owner: string
  startedAt: string
  endedAt?: string
  settings?: {
    mode?: string
    targetCount?: number
    tasks?: Array<{
      cardId: string
      prompt: string
      answer: string
      [key: string]: unknown
    }>
  }
  deckId?: string
  completedCount?: number
  [key: string]: unknown
}

export interface DailyProgressResponse {
  cardsCompleted: number
  minutesSpent: number
  sessionsCompleted: number
}

export interface ActiveSessionResponse {
  session: {
    sessionId: string
    deckName: string
    progress: string
    progressRatio: number
  } | null
}
