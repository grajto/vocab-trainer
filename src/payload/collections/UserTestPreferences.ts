import type { CollectionConfig } from 'payload'
import { isAuthenticated, isOwner } from '../access/isOwner.ts'

export const UserTestPreferences: CollectionConfig = {
  slug: 'user_test_preferences',
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  admin: { useAsTitle: 'user' },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, unique: true },
    { name: 'questionCount', type: 'number', defaultValue: 20, min: 5, max: 50 },
    { name: 'starredOnly', type: 'checkbox', defaultValue: false },
    {
      name: 'enabledTypes',
      type: 'array',
      defaultValue: ['abcd', 'tf', 'matching', 'written'],
      fields: [{ name: 'type', type: 'text' }],
    },
    { name: 'answerLanguages', type: 'array', fields: [{ name: 'lang', type: 'text' }], defaultValue: [] },
    { name: 'correctionOptions', type: 'json', defaultValue: {} },
  ],
}
