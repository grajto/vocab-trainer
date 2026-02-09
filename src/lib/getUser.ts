import { timingSafeEqual } from 'crypto'
import { headers as getHeaders, cookies as getCookies } from 'next/headers'
import { getPayload } from './getPayload'

export async function getUser() {
  const payload = await getPayload()
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })
  if (user) return user

  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) return null

  const headerToken = headersList.get('x-app-token')
  const cookieStore = await getCookies()
  const cookieToken = cookieStore.get('app-token')?.value
  const incomingToken = headerToken || cookieToken
  if (!incomingToken) return null

  const expected = Buffer.from(appToken)
  const actual = Buffer.from(incomingToken)
  if (expected.length !== actual.length) return null

  try {
    if (!timingSafeEqual(expected, actual)) {
      return null
    }
  } catch {
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
    try {
      const anyUser = await payload.find({
        collection: 'users',
        limit: 1,
        depth: 0,
      })
      if (anyUser.totalDocs === 1) {
        console.warn('App token authentication fallback: using the only user (no owner role found)')
        return anyUser.docs[0]
      }
      console.warn('App token authentication disabled: owner user missing and multiple users present', { count: anyUser.totalDocs })
    } catch (error) {
      console.error('App token fallback user lookup failed', error)
    }
    return null
  }
  if (owner.totalDocs > 1) {
    console.warn('App token authentication disabled: expects exactly one owner user', { count: owner.totalDocs })
    return null
  }
  return owner.docs[0]
}
