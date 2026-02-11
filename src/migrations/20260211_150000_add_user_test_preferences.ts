import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_test_preferences" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer NOT NULL,
      "question_count" integer DEFAULT 20,
      "starred_only" boolean DEFAULT false,
      "enabled_types" jsonb DEFAULT '[]',
      "answer_languages" jsonb DEFAULT '[]',
      "correction_options" jsonb DEFAULT '{}'::jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "user_test_preferences_user_unique" ON "user_test_preferences" ("user_id");
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "user_test_preferences" ADD CONSTRAINT "user_test_preferences_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "user_test_preferences" CASCADE;`)
}
