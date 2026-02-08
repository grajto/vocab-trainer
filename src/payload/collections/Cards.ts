import type { CollectionConfig } from 'payload'

export const Cards: CollectionConfig = {
  slug: 'cards',
  admin: { useAsTitle: 'front' },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    delete: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'deck', type: 'relationship', relationTo: 'decks', required: true, index: true },
    { name: 'front', type: 'text', required: true },
    { name: 'back', type: 'text', required: true },
    { name: 'examples', type: 'textarea' },
    { name: 'notes', type: 'textarea' },
    { name: 'cardType', type: 'select', options: [{ label: 'Word', value: 'word' }, { label: 'Phrase', value: 'phrase' }], defaultValue: 'word' },
  ],
}
