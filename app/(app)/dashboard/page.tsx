import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { HomePage } from '@/src/page-views/HomePage'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  let sessionsToday = 0
  let cardsReady = 0

  try {
    const [sessions, cards] = await Promise.all([
      payload.find({
        collection: 'sessions',
        where: { owner: { equals: user.id } },
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'cards',
        where: { owner: { equals: user.id } },
        limit: 2000,
        depth: 0,
      }),
    ])
    sessionsToday = sessions.totalDocs
    cardsReady = cards.totalDocs
  } catch (err) {
    console.error('Dashboard data fetch error:', err)
  }

  return <HomePage streak={Math.min(30, sessionsToday)} sessionsToday={sessionsToday} cardsReady={cardsReady} />
}
