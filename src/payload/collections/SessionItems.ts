import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/isOwner'

export const SessionItems: CollectionConfig = {
  slug: 'session-items',
  timestamps: true,
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAuthenticated,
    delete: isAuthenticated,
  },
  fields: [
    { name: 'session', type: 'relationship', relationTo: 'sessions', required: true, index: true },
    { name: 'card', type: 'relationship', relationTo: 'cards', required: true, index: true },
    { name: 'taskType', type: 'select', required: true, options: [
      { label: 'Translate', value: 'translate' },
      { label: 'Sentence', value: 'sentence' },
      { label: 'ABCD', value: 'abcd' },
    ]},
    { name: 'promptShown', type: 'text' },
    { name: 'userAnswer', type: 'textarea' },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false },
    { name: 'feedback', type: 'textarea' },
    { name: 'aiUsed', type: 'checkbox', defaultValue: false },
  ],
}
