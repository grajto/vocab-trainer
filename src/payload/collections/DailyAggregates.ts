import type { CollectionConfig } from 'payload'
import { isOwner, isAuthenticated } from '../access/isOwner.ts'

export const DailyAggregates: CollectionConfig = {
  slug: 'daily_aggregates',
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  admin: { useAsTitle: 'date' },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true },
    { name: 'date', type: 'date', required: true },
    { name: 'sessions', type: 'number', defaultValue: 0 },
    { name: 'questions', type: 'number', defaultValue: 0 },
    { name: 'correct', type: 'number', defaultValue: 0 },
    { name: 'wrong', type: 'number', defaultValue: 0 },
    { name: 'minutes', type: 'number', defaultValue: 0 },
  ],
}
