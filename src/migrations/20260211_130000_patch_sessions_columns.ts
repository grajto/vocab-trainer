import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sessions"
      ADD COLUMN IF NOT EXISTS "finished_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "total_questions" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "correct_answers" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "wrong_answers" numeric DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "duration_seconds" numeric DEFAULT 0;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "sessions"
      DROP COLUMN IF EXISTS "finished_at",
      DROP COLUMN IF EXISTS "total_questions",
      DROP COLUMN IF EXISTS "correct_answers",
      DROP COLUMN IF EXISTS "wrong_answers",
      DROP COLUMN IF EXISTS "duration_seconds";
  `)
}
