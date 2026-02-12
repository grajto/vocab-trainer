import { createHmac, timingSafeEqual } from 'crypto'
import { headers as getHeaders, cookies as getCookies } from 'next/headers'
import { getPayload } from './getPayload'

function verifyUsernameToken(token: string): string | null {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url')
  const expectedBuf = Buffer.from(expectedSig)
  const actualBuf = Buffer.from(signature)
  if (expectedBuf.length !== actualBuf.length) return null
  try {
    if (!timingSafeEqual(expectedBuf, actualBuf)) return null
  } catch {
    return null
  }
  try {
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as { u?: string; t?: number }
    if (!decoded.u || typeof decoded.u !== 'string') return null
    if (!decoded.t || typeof decoded.t !== 'number') return null
    const maxAgeMs = 1000 * 60 * 60 * 24 * 30 // 30 days
    if (Date.now() - decoded.t > maxAgeMs) return null
    return decoded.u
  } catch {
    return null
  }
}

export async function getUser() {
  const payload = await getPayload()
  const headersList = await getHeaders()
  const cookieStore = await getCookies()
  const fetchSite = headersList.get('sec-fetch-site')
  const origin = headersList.get('origin')
  const host = headersList.get('host')
  const originHost = origin ? new URL(origin).host : null
  const isSameOrigin = originHost && host ? originHost === host : false
  const isTrustedRequest = fetchSite === 'same-origin' ||
    fetchSite === 'same-site' ||
    fetchSite === 'none' ||
    isSameOrigin ||
    (!fetchSite && !origin)
  const { user } = await payload.auth({ headers: headersList })
  if (user) {
    console.info('[auth] Payload cookie user authenticated', { id: user.id })
    return user
  }

  // Passwordless username-based login (cookie set by /api/users/login)
  const usernameCookie = cookieStore.get('username-auth')?.value
  if (usernameCookie && isTrustedRequest) {
    const verifiedUsername = verifyUsernameToken(usernameCookie)
    if (!verifiedUsername) {
      console.warn('[auth] Invalid username cookie signature')
    }
  }
  const verifiedUsername = usernameCookie ? verifyUsernameToken(usernameCookie) : null
  if (verifiedUsername && isTrustedRequest) {
    try {
      const found = await payload.find({
        collection: 'users',
        where: { username: { equals: verifiedUsername } },
        limit: 1,
        depth: 0,
      })
      if (found.docs[0]) {
        console.info('[auth] Username cookie authenticated', { username: verifiedUsername })
        return found.docs[0]
      }
    } catch (error) {
      console.error('Username cookie lookup failed', error)
    }
  }

  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) {
    console.info('[auth] APP_ACCESS_TOKEN not set; app-token auth disabled')
    if (!isTrustedRequest) {
      console.warn('[auth] Untrusted request without app token')
      return null
    }
    let owner
    try {
      owner = await payload.find({
        collection: 'users',
        where: { role: { equals: 'owner' } },
        limit: 1,
        depth: 0,
      })
    } catch (error) {
      console.error('Fallback owner lookup failed', error)
      return null
    }
    if (owner.totalDocs !== 1) {
      console.warn('Fallback owner auth disabled: expects exactly one owner user', { count: owner.totalDocs })
      return null
    }
    console.info('[auth] Fallback single-user authenticated as owner', { id: owner.docs[0].id })
    return owner.docs[0]
  }

  const headerToken = headersList.get('x-app-token')
  const cookieToken = cookieStore.get('app-token')?.value
  const incomingToken = headerToken || cookieToken
  if (!incomingToken) {
    console.warn('[auth] Missing app token header/cookie')
    return null
  }

  const expected = Buffer.from(appToken)
  const actual = Buffer.from(incomingToken)
  if (expected.length !== actual.length) {
    console.warn('[auth] App token length mismatch')
    return null
  }

  try {
    if (!timingSafeEqual(expected, actual)) {
      console.warn('[auth] App token mismatch')
      return null
    }
  } catch {
    console.warn('[auth] App token comparison failed')
    return null
  }

  let owner
  try {
    owner = await payload.find({
      collection: 'users',
      where: { role: { equals: 'owner' } },
      limit: 1,
      depth: 0,
    })
  } catch (error) {
    console.error('App token user lookup failed', error)
    return null
  }

  if (owner.totalDocs === 0) {
    console.warn('App token authentication disabled: owner user missing')
    return null
  }
  if (owner.totalDocs > 1) {
    console.warn('App token authentication disabled: expects exactly one owner user', { count: owner.totalDocs })
    return null
  }
  console.info('[auth] App token authenticated as owner', { id: owner.docs[0].id })
  return owner.docs[0]
}
