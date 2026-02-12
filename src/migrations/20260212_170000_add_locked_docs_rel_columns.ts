import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add missing columns to payload_locked_documents_rels table
  // These columns are needed for new collections: DailyAggregates, WordStats, UserTestPreferences, UserNotifications
  // Note: Foreign key constraints are omitted because Payload manages relationships through its ORM
  // and the referenced tables may not exist yet at migration time
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels 
    ADD COLUMN IF NOT EXISTS daily_aggregates_id INTEGER,
    ADD COLUMN IF NOT EXISTS word_stats_id INTEGER,
    ADD COLUMN IF NOT EXISTS user_test_preferences_id INTEGER,
    ADD COLUMN IF NOT EXISTS user_notifications_id INTEGER;
  `)
  
  // Create indexes for better query performance
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_daily_aggregates_id_idx 
    ON payload_locked_documents_rels(daily_aggregates_id);
  `)
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_word_stats_id_idx 
    ON payload_locked_documents_rels(word_stats_id);
  `)
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_user_test_preferences_id_idx 
    ON payload_locked_documents_rels(user_test_preferences_id);
  `)
  
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_user_notifications_id_idx 
    ON payload_locked_documents_rels(user_notifications_id);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop indexes
  await db.execute(sql`
    DROP INDEX IF EXISTS payload_locked_documents_rels_user_notifications_id_idx;
  `)
  
  await db.execute(sql`
    DROP INDEX IF EXISTS payload_locked_documents_rels_user_test_preferences_id_idx;
  `)
  
  await db.execute(sql`
    DROP INDEX IF EXISTS payload_locked_documents_rels_word_stats_id_idx;
  `)
  
  await db.execute(sql`
    DROP INDEX IF EXISTS payload_locked_documents_rels_daily_aggregates_id_idx;
  `)
  
  // Drop columns
  await db.execute(sql`
    ALTER TABLE payload_locked_documents_rels 
    DROP COLUMN IF EXISTS user_notifications_id,
    DROP COLUMN IF EXISTS user_test_preferences_id,
    DROP COLUMN IF EXISTS word_stats_id,
    DROP COLUMN IF EXISTS daily_aggregates_id;
  `)
}
