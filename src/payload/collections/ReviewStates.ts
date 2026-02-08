import type { CollectionConfig } from 'payload'

export const ReviewStates: CollectionConfig = {
  slug: 'review-states',
  timestamps: true,
  access: {
    read: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    delete: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
  },
  indexes: [
    { fields: ['owner', 'card'], unique: true },
    { fields: ['owner', 'dueAt'] },
  ],
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'card', type: 'relationship', relationTo: 'cards', required: true, index: true },
    { name: 'level', type: 'number', min: 1, max: 4, defaultValue: 1, required: true },
    { name: 'dueAt', type: 'date', required: true },
    { name: 'lastReviewedAt', type: 'date' },
    { name: 'totalCorrect', type: 'number', defaultValue: 0 },
    { name: 'totalWrong', type: 'number', defaultValue: 0 },
    { name: 'todayCorrectCount', type: 'number', defaultValue: 0 },
    { name: 'todayWrongCount', type: 'number', defaultValue: 0 },
    { name: 'lastLevelUpAt', type: 'date' },
    { name: 'introducedAt', type: 'date' },
  ],
}
