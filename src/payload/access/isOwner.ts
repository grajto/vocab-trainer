import type { Access } from 'payload'

/**
 * Shared access control: only authenticated user can access their own records.
 * Used by all owner-scoped collections (Decks, Cards, ReviewStates, Sessions, SessionItems).
 */
export const isOwner: Access = ({ req: { user } }) => {
  if (!user) return false
  return { owner: { equals: user.id } }
}

export const isAuthenticated: Access = ({ req: { user } }) => !!user
