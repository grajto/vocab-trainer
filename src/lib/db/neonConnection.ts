/**
 * Neon connection tuning notes for serverless runtimes.
 *
 * This project currently uses Payload + @payloadcms/db-postgres.
 * Keep connection string flags set to minimize handshake overhead:
 * - pgbouncer=true
 * - sslmode=require (or verify-full)
 *
 * Example DATABASE_URL:
 * postgresql://...neon.../db?sslmode=require&pgbouncer=true&connect_timeout=5
 */

export const neonConnectionHints = {
  pgbouncer: true,
  fetchConnectionCache: true,
  connectTimeoutSeconds: 5,
}

export function withNeonPooling(url: string): string {
  if (!url) return url
  const hasQuery = url.includes('?')
  const suffix = 'pgbouncer=true&connect_timeout=5'
  if (url.includes('pgbouncer=')) return url
  return `${url}${hasQuery ? '&' : '?'}${suffix}`
}
