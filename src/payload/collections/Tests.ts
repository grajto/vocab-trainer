import type { CollectionConfig } from 'payload'
import { isAuthenticated, isOwner } from '../access/isOwner.ts'

export const Tests: CollectionConfig = {
  slug: 'tests',
  timestamps: true,
  access: {
    read: isOwner,
    create: isAuthenticated,
    update: isOwner,
    delete: isOwner,
  },
  fields: [
    { name: 'owner', type: 'relationship', relationTo: 'users', required: true, index: true },
    { name: 'session', type: 'relationship', relationTo: 'sessions', index: true },
    { name: 'sourceType', type: 'select', required: true, options: [{ label: 'Set', value: 'set' }, { label: 'Folder', value: 'folder' }] },
    { name: 'sourceDeck', type: 'relationship', relationTo: 'decks' },
    { name: 'sourceFolder', type: 'relationship', relationTo: 'folders' },
    { name: 'enabledModes', type: 'array', fields: [{ name: 'mode', type: 'text' }] },
    { name: 'questionCount', type: 'number', required: true },
    { name: 'randomQuestionOrder', type: 'checkbox', defaultValue: true },
    { name: 'randomAnswerOrder', type: 'checkbox', defaultValue: true },
    { name: 'startedAt', type: 'date', required: true },
    { name: 'finishedAt', type: 'date' },
    { name: 'durationMs', type: 'number', defaultValue: 0 },
    { name: 'scoreCorrect', type: 'number', defaultValue: 0 },
    { name: 'scoreTotal', type: 'number', defaultValue: 0 },
    { name: 'scorePercent', type: 'number', defaultValue: 0 },
    { name: 'status', type: 'select', required: true, defaultValue: 'in_progress', options: [{ label: 'In progress', value: 'in_progress' }, { label: 'Finished', value: 'finished' }, { label: 'Abandoned', value: 'abandoned' }] },
  ],
}
