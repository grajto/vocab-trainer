import type { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`ALTER TYPE "enum_sessions_mode" ADD VALUE IF NOT EXISTS 'test';`)
  await db.execute(sql`ALTER TYPE "enum_sessions_mode" ADD VALUE IF NOT EXISTS 'describe';`)
  await db.execute(sql`ALTER TYPE "enum_session_items_task_type" ADD VALUE IF NOT EXISTS 'describe';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`-- No-op: enums cannot easily remove values safely`)
}
