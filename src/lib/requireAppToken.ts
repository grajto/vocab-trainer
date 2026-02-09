import 'server-only'
import { timingSafeEqual } from 'crypto'

export function requireAppToken(req: Request): boolean {
  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) return true

  const headerToken = req.headers.get('x-app-token')
  if (!headerToken) return false

  const expected = Buffer.from(appToken)
  const actual = Buffer.from(headerToken)
  if (expected.length !== actual.length) return false

  try {
    return timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}
