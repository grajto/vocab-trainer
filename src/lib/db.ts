/**
 * Main database connection module for Neon serverless Postgres.
 * 
 * Uses @neondatabase/serverless HTTP driver with connection caching
 * to minimize cold start impact and optimize for serverless environments.
 */

import { neon, neonConfig, Pool } from '@neondatabase/serverless'
import { withNeonPooling } from './db/neonConnection'

// Enable connection caching for better performance in serverless
neonConfig.fetchConnectionCache = true

// Connection pool instance (lazy initialized)
let _pool: Pool | null = null

/**
 * Get a cached Neon Pool instance.
 * Reuses connections across invocations to minimize handshake overhead.
 */
export function getNeonPool(): Pool {
  if (!_pool) {
    const connectionString = withNeonPooling(process.env.DATABASE_URL!)
    _pool = new Pool({ connectionString })
  }
  return _pool
}

/**
 * Get a Neon SQL function for direct queries.
 * Use this for simple read queries that don't need transactions.
 * 
 * Note: Neon SQL uses template literals for queries.
 * Example: const sql = getNeonSql(); await sql`SELECT * FROM users WHERE id = ${userId}`
 */
export function getNeonSql() {
  const connectionString = withNeonPooling(process.env.DATABASE_URL!)
  return neon(connectionString)
}
