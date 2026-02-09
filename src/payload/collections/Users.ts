import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    loginWithUsername: {
      allowEmailLogin: true,
      requireUsername: true,
    },
  },
  admin: {
    useAsTitle: 'username',
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
