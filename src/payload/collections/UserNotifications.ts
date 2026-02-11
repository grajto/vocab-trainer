import type { CollectionConfig } from 'payload'
import { isAuthenticated, isOwner } from '../access/isOwner.ts'

export const UserNotifications: CollectionConfig = {
  slug: 'user_notifications',
  timestamps: true,
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { label: 'Stale', value: 'stale' },
        { label: 'Due', value: 'due' },
        { label: 'Goal', value: 'goal' },
        { label: 'Hard', value: 'hard' },
      ],
    },
    { name: 'message', type: 'text', required: true },
    { name: 'deck', type: 'relationship', relationTo: 'decks' },
    { name: 'card', type: 'relationship', relationTo: 'cards' },
    { name: 'count', type: 'number' },
    { name: 'read', type: 'checkbox', defaultValue: false, index: true },
    { name: 'readAt', type: 'date' },
    { name: 'sourceKey', type: 'text', index: true },
  ],
}
