import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "decks" ADD COLUMN IF NOT EXISTS "folder_id" integer;
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "decks_folder_idx" ON "decks" USING btree ("folder_id");
  `)
  await db.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "decks" ADD CONSTRAINT "decks_folder_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "decks" DROP CONSTRAINT IF EXISTS "decks_folder_fk";
  `)
  await db.execute(sql`
    ALTER TABLE "decks" DROP COLUMN IF EXISTS "folder_id";
  `)
  await db.execute(sql`
    DROP INDEX IF EXISTS "decks_folder_idx";
  `)
}
