import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

// Recreate tests / tests_enabled_modes tables for environments where previous migration didn't run

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const db = payload.db

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tests (
      id SERIAL PRIMARY KEY,
      owner INTEGER,
      session INTEGER,
      "sourceType" VARCHAR(32) NOT NULL,
      "sourceDeck" INTEGER,
      "sourceFolder" INTEGER,
      "questionCount" INTEGER NOT NULL DEFAULT 0,
      "randomQuestionOrder" BOOLEAN DEFAULT TRUE,
      "randomAnswerOrder" BOOLEAN DEFAULT TRUE,
      "startedAt" TIMESTAMP WITH TIME ZONE,
      "finishedAt" TIMESTAMP WITH TIME ZONE,
      "durationMs" INTEGER DEFAULT 0,
      "scoreCorrect" INTEGER DEFAULT 0,
      "scoreTotal" INTEGER DEFAULT 0,
      "scorePercent" INTEGER DEFAULT 0,
      status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tests_enabled_modes (
      id SERIAL PRIMARY KEY,
      _order INTEGER,
      _parent_id INTEGER,
      mode VARCHAR(32) NOT NULL
    );
  `)

  await db.execute(`CREATE INDEX IF NOT EXISTS tests_enabled_modes_parent_idx ON tests_enabled_modes (_parent_id);`)
  await db.execute(`CREATE INDEX IF NOT EXISTS tests_enabled_modes_order_idx ON tests_enabled_modes (_order);`)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  const db = payload.db
  await db.execute(`DROP TABLE IF EXISTS tests_enabled_modes;`)
  await db.execute(`DROP TABLE IF EXISTS tests;`)
}
