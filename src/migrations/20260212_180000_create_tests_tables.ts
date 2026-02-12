import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create tests table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tests (
      id serial PRIMARY KEY,
      owner_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id integer REFERENCES sessions(id) ON DELETE SET NULL,
      source_type text NOT NULL,
      source_deck_id integer REFERENCES decks(id) ON DELETE SET NULL,
      source_folder_id integer REFERENCES folders(id) ON DELETE SET NULL,
      question_count integer NOT NULL,
      random_question_order boolean DEFAULT true,
      random_answer_order boolean DEFAULT true,
      started_at timestamp(3) with time zone NOT NULL,
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

  // Create indexes for tests table
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tests_owner_id_idx ON tests(owner_id);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tests_session_id_idx ON tests(session_id);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tests_created_at_idx ON tests(created_at);
  `)

  // Create tests_enabled_modes table (array field)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tests_enabled_modes (
      id serial PRIMARY KEY,
      _order integer NOT NULL,
      _parent_id integer NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
      mode text
    );
  `)

  // Create index for tests_enabled_modes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tests_enabled_modes_order_idx ON tests_enabled_modes(_order);
  `)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS tests_enabled_modes_parent_id_idx ON tests_enabled_modes(_parent_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop tables in reverse order (child tables first)
  await db.execute(sql`DROP TABLE IF EXISTS tests_enabled_modes CASCADE;`)
  await db.execute(sql`DROP TABLE IF EXISTS tests CASCADE;`)
}
