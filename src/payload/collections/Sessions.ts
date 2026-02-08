import type { CollectionConfig } from 'payload'

export const Sessions: CollectionConfig = {
  slug: 'sessions',
  timestamps: true,
  access: {
    read: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    delete: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'mode', type: 'select', required: true, options: [
      { label: 'Translate', value: 'translate' },
      { label: 'Sentence', value: 'sentence' },
      { label: 'ABCD', value: 'abcd' },
      { label: 'Mixed', value: 'mixed' },
    ]},
    { name: 'deck', type: 'relationship', relationTo: 'decks', required: true },
    { name: 'targetCount', type: 'number', min: 5, max: 35, required: true },
    { name: 'completedCount', type: 'number', defaultValue: 0 },
    { name: 'accuracy', type: 'number' },
    { name: 'startedAt', type: 'date' },
    { name: 'endedAt', type: 'date' },
    { name: 'settings', type: 'json' },
  ],
}
