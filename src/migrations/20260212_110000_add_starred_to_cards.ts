import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from 'drizzle-orm'

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    -- Add starred column to cards table
    ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "starred" boolean DEFAULT false;
    
    -- Add index for better query performance on starred cards
    CREATE INDEX IF NOT EXISTS "cards_starred_idx" ON "cards"("starred");
    CREATE INDEX IF NOT EXISTS "cards_owner_starred_idx" ON "cards"("owner_id", "starred");
  `)
}

export async function down({ payload, req }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    -- Remove indexes
    DROP INDEX IF EXISTS "cards_owner_starred_idx";
    DROP INDEX IF EXISTS "cards_starred_idx";
    
    -- Remove starred column
    ALTER TABLE "cards" DROP COLUMN IF EXISTS "starred";
  `)
}
