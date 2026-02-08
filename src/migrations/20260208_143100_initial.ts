import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Create enum types for select fields
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_cards_card_type" AS ENUM('word', 'phrase');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_sessions_mode" AS ENUM('translate', 'sentence', 'abcd', 'mixed');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_session_items_task_type" AS ENUM('translate', 'sentence', 'abcd');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // Create users table (auth collection)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" serial PRIMARY KEY NOT NULL,
      "email" varchar NOT NULL,
      "reset_password_token" varchar,
      "reset_password_expiration" timestamp(3) with time zone,
      "salt" varchar,
      "hash" varchar,
      "login_attempts" numeric DEFAULT 0,
      "lock_until" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Create unique index on users email
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  `)

  // Create decks table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "decks" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_owner_idx" ON "decks" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_updated_at_idx" ON "decks" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_created_at_idx" ON "decks" USING btree ("created_at");
  `)

  // Create decks_tags table (array field)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "decks_tags" (
      "id" serial PRIMARY KEY NOT NULL,
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "tag" varchar
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_tags_order_idx" ON "decks_tags" USING btree ("_order");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_tags_parent_id_idx" ON "decks_tags" USING btree ("_parent_id");
  `)

  // Create cards table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cards" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "deck_id" integer NOT NULL,
      "front" varchar NOT NULL,
      "back" varchar NOT NULL,
      "examples" varchar,
      "notes" varchar,
      "card_type" "enum_cards_card_type" DEFAULT 'word',
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cards_owner_idx" ON "cards" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cards_deck_idx" ON "cards" USING btree ("deck_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cards_updated_at_idx" ON "cards" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cards_created_at_idx" ON "cards" USING btree ("created_at");
  `)

  // Create review_states table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "review_states" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "card_id" integer NOT NULL,
      "level" numeric DEFAULT 1 NOT NULL,
      "due_at" timestamp(3) with time zone NOT NULL,
      "last_reviewed_at" timestamp(3) with time zone,
      "total_correct" numeric DEFAULT 0,
      "total_wrong" numeric DEFAULT 0,
      "today_correct_count" numeric DEFAULT 0,
      "today_wrong_count" numeric DEFAULT 0,
      "last_level_up_at" timestamp(3) with time zone,
      "introduced_at" timestamp(3) with time zone,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "review_states_owner_idx" ON "review_states" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "review_states_card_idx" ON "review_states" USING btree ("card_id");
  `)

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "review_states_owner_card_idx" ON "review_states" USING btree ("owner_id", "card_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "review_states_owner_due_at_idx" ON "review_states" USING btree ("owner_id", "due_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "review_states_updated_at_idx" ON "review_states" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "review_states_created_at_idx" ON "review_states" USING btree ("created_at");
  `)

  // Create sessions table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "mode" "enum_sessions_mode" NOT NULL,
      "deck_id" integer NOT NULL,
      "target_count" numeric NOT NULL,
      "completed_count" numeric DEFAULT 0,
      "accuracy" numeric,
      "started_at" timestamp(3) with time zone,
      "ended_at" timestamp(3) with time zone,
      "settings" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sessions_owner_idx" ON "sessions" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sessions_deck_idx" ON "sessions" USING btree ("deck_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sessions_updated_at_idx" ON "sessions" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "sessions_created_at_idx" ON "sessions" USING btree ("created_at");
  `)

  // Create session_items table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "session_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "session_id" integer NOT NULL,
      "card_id" integer NOT NULL,
      "task_type" "enum_session_items_task_type" NOT NULL,
      "prompt_shown" varchar,
      "user_answer" varchar,
      "is_correct" boolean DEFAULT false,
      "feedback" varchar,
      "ai_used" boolean DEFAULT false,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "session_items_session_idx" ON "session_items" USING btree ("session_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "session_items_card_idx" ON "session_items" USING btree ("card_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "session_items_updated_at_idx" ON "session_items" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "session_items_created_at_idx" ON "session_items" USING btree ("created_at");
  `)

  // Add foreign keys
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "decks" ADD CONSTRAINT "decks_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "decks_tags" ADD CONSTRAINT "decks_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "cards" ADD CONSTRAINT "cards_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "cards" ADD CONSTRAINT "cards_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "review_states" ADD CONSTRAINT "review_states_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "review_states" ADD CONSTRAINT "review_states_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "sessions" ADD CONSTRAINT "sessions_deck_id_decks_id_fk" FOREIGN KEY ("deck_id") REFERENCES "public"."decks"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "session_items" ADD CONSTRAINT "session_items_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "session_items" ADD CONSTRAINT "session_items_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // Create payload_locked_documents and payload_preferences tables (Payload internal)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
      "id" serial PRIMARY KEY NOT NULL,
      "global_slug" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "users_id" integer,
      "decks_id" integer,
      "cards_id" integer,
      "review_states_id" integer,
      "sessions_id" integer,
      "session_items_id" integer
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload_preferences" (
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "value" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "users_id" integer
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  `)

  // Create payload_migrations table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload_migrations" (
      "id" serial PRIMARY KEY NOT NULL,
      "name" varchar,
      "batch" numeric,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  `)

  // FK for locked documents rels
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_decks_fk" FOREIGN KEY ("decks_id") REFERENCES "public"."decks"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cards_fk" FOREIGN KEY ("cards_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_review_states_fk" FOREIGN KEY ("review_states_id") REFERENCES "public"."review_states"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_sessions_fk" FOREIGN KEY ("sessions_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_session_items_fk" FOREIGN KEY ("session_items_id") REFERENCES "public"."session_items"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // FK for preferences rels
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS "payload_preferences_rels" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_preferences" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_locked_documents_rels" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_locked_documents" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "payload_migrations" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "session_items" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "sessions" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "review_states" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "cards" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "decks_tags" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "decks" CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS "users" CASCADE;`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_session_items_task_type";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_sessions_mode";`)
  await db.execute(sql`DROP TYPE IF EXISTS "enum_cards_card_type";`)
}
