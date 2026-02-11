/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { TestList } from './TestList'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'

export const dynamic = 'force-dynamic'

export default async function TestPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  
  // Get user's test sessions (mode='test')
  let testSessions: any = { docs: [] }
  try {
    testSessions = await payload.find({
      collection: 'sessions',
      where: {
        owner: { equals: user.id },
        mode: { equals: 'test' }
      },
      sort: '-startedAt',
      limit: 50,
      depth: 1,
    })
  } catch (err) {
    console.error('Test page data fetch error:', err)
  }

  return (
    <PageContainer>
      <PageHeader title="Testy" description="Historia twoich testów i wyników" icon={ClipboardCheck} />

      <TestList sessions={testSessions.docs} />
    </PageContainer>
  )
}
