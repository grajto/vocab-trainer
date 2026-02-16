import 'server-only'

function getCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)app-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * Edge-compatible timing-safe string comparison.
 * Compares two strings in constant time to prevent timing attacks.
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

export function requireAppToken(req: Request): boolean {
  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) return true

  const headerToken = req.headers.get('x-app-token')
  const cookieToken = getCookieToken(req)
  const incomingToken = headerToken || cookieToken
  if (!incomingToken) return false

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeCompare(appToken, incomingToken)
}
