import type { CollectionConfig } from 'payload'
import { isAuthenticated, isOwner } from '../access/isOwner.ts'

export const TestAnswers: CollectionConfig = {
  slug: 'test_answers',
  timestamps: true,
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'test', type: 'relationship', relationTo: 'tests', required: true, index: true },
    { name: 'card', type: 'relationship', relationTo: 'cards', required: true, index: true },
    { name: 'modeUsed', type: 'text', required: true },
    { name: 'promptShown', type: 'text' },
    { name: 'userAnswer', type: 'textarea' },
    { name: 'isCorrect', type: 'checkbox', defaultValue: false },
    { name: 'timeMs', type: 'number', defaultValue: 0 },
    { name: 'answeredAt', type: 'date' },
  ],
}
