import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS review_states_owner_card_idx
      ON review_states(owner_id, card_id);
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS review_states_due_at_idx
      ON review_states(due_at);
  `)

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS cards_owner_deck_idx
      ON cards(owner_id, deck_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`DROP INDEX IF EXISTS review_states_owner_card_idx;`)
  await db.execute(sql`DROP INDEX IF EXISTS review_states_due_at_idx;`)
  await db.execute(sql`DROP INDEX IF EXISTS cards_owner_deck_idx;`)
}
