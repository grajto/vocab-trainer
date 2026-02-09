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
    {
      name: 'studySettings',
      type: 'group',
      fields: [
        {
          name: 'minSessionsPerDay',
          type: 'number',
          defaultValue: 1,
          min: 1,
          max: 10,
        },
        {
          name: 'minMinutesPerDay',
          type: 'number',
          defaultValue: 10,
          min: 5,
          max: 180,
        },
        {
          name: 'dailyGoalMode',
          type: 'select',
          defaultValue: 'sessions',
          options: [
            { label: 'Sesje', value: 'sessions' },
            { label: 'Minuty', value: 'minutes' },
            { label: 'Hybrydowy', value: 'hybrid' },
          ],
        },
        {
          name: 'defaultDirection',
          type: 'select',
          defaultValue: 'pl-en',
          options: [
            { label: 'PL → EN', value: 'pl-en' },
            { label: 'EN → PL', value: 'en-pl' },
            { label: 'Oba', value: 'both' },
          ],
        },
        {
          name: 'mixTranslate',
          type: 'number',
          defaultValue: 50,
          min: 0,
          max: 100,
        },
        {
          name: 'mixAbcd',
          type: 'number',
          defaultValue: 30,
          min: 0,
          max: 100,
        },
        {
          name: 'mixSentence',
          type: 'number',
          defaultValue: 20,
          min: 0,
          max: 100,
        },
        {
          name: 'maxNewPerDay',
          type: 'number',
          defaultValue: 20,
          min: 0,
          max: 200,
        },
      ],
    },
  ],
}
