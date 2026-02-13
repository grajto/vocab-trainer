import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

// Ensure tests tables exist for persisted test history
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tests (
      id serial PRIMARY KEY,
      owner_id integer,
      session_id integer,
      source_type text NOT NULL,
      source_deck_id integer,
      source_folder_id integer,
      question_count integer NOT NULL DEFAULT 0,
      random_question_order boolean DEFAULT true,
      random_answer_order boolean DEFAULT true,
      started_at timestamp(3) with time zone,
      finished_at timestamp(3) with time zone,
      duration_ms integer DEFAULT 0,
      score_correct integer DEFAULT 0,
      score_total integer DEFAULT 0,
      score_percent numeric DEFAULT 0,
      status text NOT NULL DEFAULT 'in_progress',
      updated_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
    );
  `)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tests_enabled_modes (
      id serial PRIMARY KEY,
      _order integer NOT NULL,
      _parent_id integer NOT NULL,
      mode text
    );
  `)

  await db.execute(sql`CREATE INDEX IF NOT EXISTS tests_enabled_modes_parent_idx ON tests_enabled_modes (_parent_id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS tests_enabled_modes_order_idx ON tests_enabled_modes (_order);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP TABLE IF EXISTS tests_enabled_modes CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS tests CASCADE;`)
}
