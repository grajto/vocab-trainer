import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  fields: [
    {
      name: 'role',
      type: 'text',
      defaultValue: 'owner',
      admin: { description: 'User role (single-user app, always "owner")' },
    },
  ],
}
