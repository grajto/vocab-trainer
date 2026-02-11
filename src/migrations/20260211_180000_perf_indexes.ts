import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_stat_statements;`)

  await db.execute(sql`ALTER INDEX IF EXISTS idx_cards_owner_deck_partial RENAME TO idx_cards_owner_deck;`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_cards_owner_deck ON cards (owner_id, deck_id, id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_review_states_owner_due_card ON review_states (owner_id, due_at, card_id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sessions_owner_started ON sessions (owner_id, started_at DESC);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_decks_owner_folder ON decks (owner_id, folder_id, id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_test_answers_owner_test ON test_answers (owner_id, test_id, answered_at DESC);`)

  // payload_locked_documents_rels may not be fully migrated in some environments
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payload_locked_users ON payload_locked_documents_rels (users_id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payload_locked_decks ON payload_locked_documents_rels (decks_id);`)
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_payload_locked_folders ON payload_locked_documents_rels (folders_id);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS idx_cards_owner_deck;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_cards_owner_deck_partial;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_review_states_owner_due_card;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_sessions_owner_started;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_decks_owner_folder;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_test_answers_owner_test;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_payload_locked_users;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_payload_locked_decks;`)
  await db.execute(sql`DROP INDEX IF EXISTS idx_payload_locked_folders;`)
}
