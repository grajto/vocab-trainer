import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Add direction enum + column to decks
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_decks_direction" AS ENUM ('front-to-back', 'back-to-front', 'both');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "direction" "enum_decks_direction" DEFAULT 'front-to-back';
  `)

  // 2. Add new fields to session_items
  await db.execute(sql`
    ALTER TABLE "session_items" ADD COLUMN IF NOT EXISTS "attempts_count" numeric DEFAULT 1;
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" ADD COLUMN IF NOT EXISTS "was_wrong_before_correct" boolean DEFAULT false;
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" ADD COLUMN IF NOT EXISTS "used_hint" boolean DEFAULT false;
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" ADD COLUMN IF NOT EXISTS "user_override" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "session_items" DROP COLUMN IF EXISTS "user_override";
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" DROP COLUMN IF EXISTS "used_hint";
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" DROP COLUMN IF EXISTS "was_wrong_before_correct";
  `)

  await db.execute(sql`
    ALTER TABLE "session_items" DROP COLUMN IF EXISTS "attempts_count";
  `)

  await db.execute(sql`
    ALTER TABLE "decks" DROP COLUMN IF EXISTS "direction";
  `)

  await db.execute(sql`DROP TYPE IF EXISTS "enum_decks_direction" CASCADE;`)
}
