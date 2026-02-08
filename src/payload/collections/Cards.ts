import type { CollectionConfig } from 'payload'
import { isOwner, isAuthenticated } from '../access/isOwner'

export const Cards: CollectionConfig = {
  slug: 'cards',
  admin: { useAsTitle: 'front' },
  timestamps: true,
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
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
