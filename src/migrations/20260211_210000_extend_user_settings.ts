import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_users_default_study_mode" AS ENUM ('translate', 'abcd', 'sentence', 'describe', 'mixed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_daily_goal_words" numeric DEFAULT 20;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_default_study_mode" "enum_users_default_study_mode" DEFAULT 'translate';
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_shuffle_words" boolean DEFAULT true;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_sound_enabled" boolean DEFAULT true;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_auto_advance" boolean DEFAULT true;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_dark_mode" boolean DEFAULT false;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_dark_mode";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_auto_advance";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_sound_enabled";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_shuffle_words";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_default_study_mode";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_daily_goal_words";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_users_default_study_mode" CASCADE;`)
}
