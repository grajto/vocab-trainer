import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/isOwner.ts'

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
      { label: 'Describe', value: 'describe' },
    ]},
    { name: 'promptShown', type: 'text' },
    { name: 'userAnswer', type: 'textarea' },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false },
    { name: 'feedback', type: 'textarea' },
    { name: 'aiUsed', type: 'checkbox', defaultValue: false },
    { name: 'attemptsCount', type: 'number', defaultValue: 1 },
    { name: 'wasWrongBeforeCorrect', type: 'checkbox', defaultValue: false },
    { name: 'usedHint', type: 'checkbox', defaultValue: false },
    { name: 'userOverride', type: 'checkbox', defaultValue: false },

    { name: 'responseTimeMs', type: 'number', defaultValue: 0 },
    { name: 'streakAfterAnswer', type: 'number', defaultValue: 0 },
    { name: 'levelAfterAnswer', type: 'number' },
    { name: 'answeredAt', type: 'date' },
  ],
}
