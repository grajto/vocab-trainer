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

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "daily_aggregates" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "date" timestamp(3) with time zone NOT NULL,
      "sessions" numeric DEFAULT 0,
      "questions" numeric DEFAULT 0,
      "correct" numeric DEFAULT 0,
      "wrong" numeric DEFAULT 0,
      "minutes" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "daily_aggregates_owner_date_idx" ON "daily_aggregates" USING btree ("owner_id","date");
  `)
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "daily_aggregates_owner_date_unique" ON "daily_aggregates" ("owner_id","date");
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "daily_aggregates" ADD CONSTRAINT "daily_aggregates_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "word_stats" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "card_id" integer NOT NULL,
      "deck_id" integer NOT NULL,
      "total_wrong" numeric DEFAULT 0,
      "total_correct" numeric DEFAULT 0,
      "last_seen_at" timestamp(3) with time zone,
      "streak" numeric DEFAULT 0,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "word_stats_owner_card_idx" ON "word_stats" USING btree ("owner_id","card_id");
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "word_stats" ADD CONSTRAINT "word_stats_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "word_stats" ADD CONSTRAINT "word_stats_card_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "word_stats" ADD CONSTRAINT "word_stats_deck_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "daily_aggregates";`)
  await db.execute(sql`DROP TABLE IF EXISTS "word_stats";`)
  await db.execute(sql`
    ALTER TABLE "sessions"
      DROP COLUMN IF EXISTS "finished_at",
      DROP COLUMN IF EXISTS "total_questions",
      DROP COLUMN IF EXISTS "correct_answers",
      DROP COLUMN IF EXISTS "wrong_answers",
      DROP COLUMN IF EXISTS "duration_seconds";
  `)
}
