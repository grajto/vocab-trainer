import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create enum types for tests
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_tests_source_type" AS ENUM('set', 'folder');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_tests_status" AS ENUM('in_progress', 'finished', 'abandoned');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // Create tests table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tests" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "session_id" integer,
      "source_type" "enum_tests_source_type" NOT NULL,
      "source_deck_id" integer,
      "source_folder_id" integer,
      "question_count" numeric NOT NULL,
      "random_question_order" boolean DEFAULT true,
      "random_answer_order" boolean DEFAULT true,
      "started_at" timestamp(3) with time zone NOT NULL,
      "finished_at" timestamp(3) with time zone,
      "duration_ms" numeric DEFAULT 0,
      "score_correct" numeric DEFAULT 0,
      "score_total" numeric DEFAULT 0,
      "score_percent" numeric DEFAULT 0,
      "status" "enum_tests_status" NOT NULL DEFAULT 'in_progress',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Create tests_enabled_modes table (array field)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "tests_enabled_modes" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "mode" varchar
    );
  `)

  // Create indexes for tests
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_owner_idx" ON "tests" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_session_idx" ON "tests" USING btree ("session_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_updated_at_idx" ON "tests" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_created_at_idx" ON "tests" USING btree ("created_at");
  `)

  // Create indexes for tests_enabled_modes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_enabled_modes_order_idx" ON "tests_enabled_modes" USING btree ("_order");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "tests_enabled_modes_parent_id_idx" ON "tests_enabled_modes" USING btree ("_parent_id");
  `)

  // Create foreign keys for tests
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tests" ADD CONSTRAINT "tests_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tests" ADD CONSTRAINT "tests_session_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tests" ADD CONSTRAINT "tests_source_deck_fk" FOREIGN KEY ("source_deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tests" ADD CONSTRAINT "tests_source_folder_fk" FOREIGN KEY ("source_folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "tests_enabled_modes" ADD CONSTRAINT "tests_enabled_modes_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // Create test_answers table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "test_answers" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "test_id" integer NOT NULL,
      "card_id" integer NOT NULL,
      "mode_used" varchar NOT NULL,
      "prompt_shown" varchar,
      "user_answer" text,
      "is_correct" boolean DEFAULT false,
      "time_ms" numeric DEFAULT 0,
      "answered_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Create indexes for test_answers
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "test_answers_owner_idx" ON "test_answers" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "test_answers_test_idx" ON "test_answers" USING btree ("test_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "test_answers_card_idx" ON "test_answers" USING btree ("card_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "test_answers_updated_at_idx" ON "test_answers" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "test_answers_created_at_idx" ON "test_answers" USING btree ("created_at");
  `)

  // Create foreign keys for test_answers
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_test_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_card_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "test_answers" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "tests_enabled_modes" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "tests" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_tests_source_type";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_tests_status";`)
}
