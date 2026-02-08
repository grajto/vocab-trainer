import type { CollectionConfig } from 'payload'

export const Decks: CollectionConfig = {
  slug: 'decks',
  admin: { useAsTitle: 'name' },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
    delete: ({ req: { user } }) => user ? { owner: { equals: user.id } } : false,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
  ],
}
