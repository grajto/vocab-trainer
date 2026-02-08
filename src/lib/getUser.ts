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

  if (headerToken !== appToken) return null

  const owner = await payload.find({
    collection: 'users',
    where: { role: { equals: 'owner' } },
    limit: 1,
    depth: 0,
    sort: '-createdAt',
  })

  if (owner.docs.length === 0) return null
  return owner.docs[0]
}
