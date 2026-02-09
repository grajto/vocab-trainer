import { timingSafeEqual } from 'crypto'
import { headers as getHeaders, cookies as getCookies } from 'next/headers'
import { getPayload } from './getPayload'

export async function getUser() {
  const payload = await getPayload()
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })
  if (user) {
    console.info('[auth] Payload cookie user authenticated', { id: user.id })
    return user
  }

  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) {
    console.info('[auth] APP_ACCESS_TOKEN not set; app-token auth disabled')
    return null
  }

  const headerToken = headersList.get('x-app-token')
  const cookieStore = await getCookies()
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
