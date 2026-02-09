import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // 1. Add 'sentence' value to enum_cards_card_type if not present
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TYPE "enum_cards_card_type" ADD VALUE IF NOT EXISTS 'sentence';
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  // 2. Create the folders table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "folders" (
      "id" serial PRIMARY KEY NOT NULL,
      "owner_id" integer NOT NULL,
      "name" varchar NOT NULL,
      "description" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "folders_owner_idx" ON "folders" USING btree ("owner_id");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "folders_updated_at_idx" ON "folders" USING btree ("updated_at");
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "folders_created_at_idx" ON "folders" USING btree ("created_at");
  `)

  // 3. Add folder_id column to decks
  await db.execute(sql`
    ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "folder_id" integer;
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_folder_idx" ON "decks" USING btree ("folder_id");
  `)

  // 4. Add folders_id to payload_locked_documents_rels
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "folders_id" integer;
  `)

  // 5. Foreign keys
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "decks" ADD CONSTRAINT "decks_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)

  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_folders_fk" FOREIGN KEY ("folders_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Remove foreign keys
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_folders_fk";
  `)

  await db.execute(sql`
    ALTER TABLE "decks" DROP CONSTRAINT IF EXISTS "decks_folder_id_folders_id_fk";
  `)

  await db.execute(sql`
    ALTER TABLE "folders" DROP CONSTRAINT IF EXISTS "folders_owner_id_users_id_fk";
  `)

  // Remove columns
  await db.execute(sql`
    ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "folders_id";
  `)

  await db.execute(sql`
    DROP INDEX IF EXISTS "decks_folder_idx";
  `)

  await db.execute(sql`
    ALTER TABLE "decks" DROP COLUMN IF EXISTS "folder_id";
  `)

  // Drop folders table
  await db.execute(sql`DROP TABLE IF EXISTS "folders" CASCADE;`)
}
