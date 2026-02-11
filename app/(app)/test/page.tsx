/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { TestList } from './TestList'

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
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      {/* Header - matching folder page style */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--warning)', color: '#fff' }}
        >
          <ClipboardCheck size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Testy
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Historia twoich testów i wyników
          </p>
        </div>
      </div>

      <TestList sessions={testSessions.docs} />
    </div>
  )
}
