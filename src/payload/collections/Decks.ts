import type { CollectionConfig } from 'payload'
import { isOwner, isAuthenticated } from '../access/isOwner.ts'

export const Decks: CollectionConfig = {
  slug: 'decks',
  admin: { useAsTitle: 'name' },
  timestamps: true,
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'folder', type: 'relationship', relationTo: 'folders', index: true },
    {
      name: 'direction',
      type: 'select',
      defaultValue: 'front-to-back',
      options: [
        { label: 'Front → Back', value: 'front-to-back' },
        { label: 'Back → Front', value: 'back-to-front' },
        { label: 'Both (random)', value: 'both' },
      ],
    },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
  ],
}
