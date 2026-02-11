import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'

import { Users } from './collections/Users.ts'
import { Folders } from './collections/Folders.ts'
import { Decks } from './collections/Decks.ts'
import { Cards } from './collections/Cards.ts'
import { ReviewStates } from './collections/ReviewStates.ts'
import { Sessions } from './collections/Sessions.ts'
import { SessionItems } from './collections/SessionItems.ts'
import { DailyAggregates } from './collections/DailyAggregates.ts'
import { WordStats } from './collections/WordStats.ts'
import { UserTestPreferences } from './collections/UserTestPreferences.ts'
import { UserNotifications } from './collections/UserNotifications.ts'
import { TestAnswers } from './collections/TestAnswers.ts'
import { Tests } from './collections/Tests.ts'
import { withNeonPooling } from '../lib/db/neonConnection.ts'

const serverURL =
  process.env.PAYLOAD_PUBLIC_SERVER_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  serverURL,
  admin: {
    user: Users.slug,
  },
  collections: [Users, Folders, Decks, Cards, ReviewStates, Sessions, SessionItems, DailyAggregates, WordStats, UserTestPreferences, UserNotifications, Tests, TestAnswers],
  db: postgresAdapter({
    pool: {
      connectionString: withNeonPooling(process.env.DATABASE_URL!),
    },
  }),
  typescript: {
    outputFile: path.resolve(process.cwd(), 'src/payload/payload-types.ts'),
  },
})
