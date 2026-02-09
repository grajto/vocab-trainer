import 'server-only'
import { timingSafeEqual } from 'crypto'

function getCookieToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie')
  if (!cookieHeader) return null
  const match = cookieHeader.match(/(?:^|;\s*)app-token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function requireAppToken(req: Request): boolean {
  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) return true

  const headerToken = req.headers.get('x-app-token')
  const cookieToken = getCookieToken(req)
  const incomingToken = headerToken || cookieToken
  if (!incomingToken) return false

  const expected = Buffer.from(appToken)
  const actual = Buffer.from(incomingToken)
  if (expected.length !== actual.length) return false

  try {
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
