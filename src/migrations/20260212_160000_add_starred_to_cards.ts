import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE cards
    ADD COLUMN IF NOT EXISTS starred BOOLEAN DEFAULT false;
  `)
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cards_starred_idx ON cards(starred);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS cards_starred_idx;
  `)
  
  await db.execute(sql`
    ALTER TABLE cards
    DROP COLUMN IF EXISTS starred;
  `)
}
