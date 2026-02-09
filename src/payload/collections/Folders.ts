import type { CollectionConfig } from 'payload'
import { isOwner, isAuthenticated } from '../access/isOwner.ts'

export const Folders: CollectionConfig = {
  slug: 'folders',
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
  ],
}
