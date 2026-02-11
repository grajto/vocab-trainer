/**
 * Normalize DATABASE_URL for Neon/serverless usage.
 *
 * - Prefer `sslmode=verify-full` to avoid pg warning and keep strict TLS checks.
 * - Ensure `pgbouncer=true` and `connect_timeout=5` for serverless handshakes.
 */

export const neonConnectionHints = {
  pgbouncer: true,
  fetchConnectionCache: true,
  connectTimeoutSeconds: 5,
  sslmode: 'verify-full',
} as const

export function withNeonPooling(url: string): string {
  if (!url) return url

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (!parsed.searchParams.has('pgbouncer')) parsed.searchParams.set('pgbouncer', 'true')
  if (!parsed.searchParams.has('connect_timeout')) parsed.searchParams.set('connect_timeout', '5')

  const sslmode = parsed.searchParams.get('sslmode')
  if (!sslmode || sslmode === 'require' || sslmode === 'prefer' || sslmode === 'verify-ca') {
    parsed.searchParams.set('sslmode', 'verify-full')
  }

  return parsed.toString()
}
