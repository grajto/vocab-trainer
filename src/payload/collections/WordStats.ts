import type { CollectionConfig } from 'payload'
import { isOwner, isAuthenticated } from '../access/isOwner.ts'

export const WordStats: CollectionConfig = {
  slug: 'word_stats',
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'card', type: 'relationship', relationTo: 'cards', required: true },
    { name: 'deck', type: 'relationship', relationTo: 'decks', required: true },
    { name: 'totalWrong', type: 'number', defaultValue: 0 },
    { name: 'totalCorrect', type: 'number', defaultValue: 0 },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'streak', type: 'number', defaultValue: 0 },
  ],
}
