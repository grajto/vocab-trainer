import path from 'path'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'

import { Users } from './collections/Users'
import { Decks } from './collections/Decks'
import { Cards } from './collections/Cards'
import { ReviewStates } from './collections/ReviewStates'
import { Sessions } from './collections/Sessions'
import { SessionItems } from './collections/SessionItems'

export default buildConfig({
  secret: process.env.PAYLOAD_SECRET!,
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  admin: {
    user: Users.slug,
  },
  collections: [Users, Decks, Cards, ReviewStates, Sessions, SessionItems],
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL!,
    },
  }),
  typescript: {
    outputFile: path.resolve(process.cwd(), 'src/payload/payload-types.ts'),
  },
})
