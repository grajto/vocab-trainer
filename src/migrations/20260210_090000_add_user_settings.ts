import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_users_daily_goal_mode" AS ENUM ('sessions', 'minutes', 'hybrid');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_users_default_direction" AS ENUM ('pl-en', 'en-pl', 'both');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_min_sessions_per_day" numeric DEFAULT 1;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_min_minutes_per_day" numeric DEFAULT 10;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_daily_goal_mode" "enum_users_daily_goal_mode" DEFAULT 'sessions';
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_default_direction" "enum_users_default_direction" DEFAULT 'pl-en';
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_mix_translate" numeric DEFAULT 50;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_mix_abcd" numeric DEFAULT 30;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_mix_sentence" numeric DEFAULT 20;
  `)

  await db.execute(sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "study_settings_max_new_per_day" numeric DEFAULT 20;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_max_new_per_day";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_mix_sentence";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_mix_abcd";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_mix_translate";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_default_direction";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_daily_goal_mode";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_min_minutes_per_day";`)
  await db.execute(sql`ALTER TABLE "users" DROP COLUMN IF EXISTS "study_settings_min_sessions_per_day";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_users_default_direction" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_users_daily_goal_mode" CASCADE;`)
}
