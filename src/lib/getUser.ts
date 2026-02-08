import { timingSafeEqual } from 'crypto'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from './getPayload'

export async function getUser() {
  const payload = await getPayload()
  const headersList = await getHeaders()
  const { user } = await payload.auth({ headers: headersList })
  if (user) return user

  const appToken = process.env.APP_ACCESS_TOKEN
  if (!appToken) return null

  const headerToken = headersList.get('x-app-token')
  if (!headerToken) return null

  const expected = Buffer.from(appToken)
  const actual = Buffer.from(headerToken)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }

  let owner
  try {
    owner = await payload.find({
      collection: 'users',
      where: { role: { equals: 'owner' } },
      limit: 1,
      depth: 0,
      sort: '-createdAt',
    })
  } catch (error) {
    console.error('App token user lookup failed', error)
    return null
  }

  if (owner.docs.length === 0) return null
  return owner.docs[0]
}
