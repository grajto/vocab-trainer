/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from '@/app/(app)/learn/StartSessionForm'
import { Card } from '@/app/(app)/_components/ui/Card'
import { SectionHeader } from '@/app/(app)/_components/ui/SectionHeader'
import { Button } from '@/app/(app)/_components/ui/Button'

export const dynamic = 'force-dynamic'

export default async function StudyPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let decks: any = { docs: [] }
  let folders: any = { docs: [] }
  try {
    const results = await Promise.all([
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 100, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 100, depth: 0 }),
    ])
    decks = results[0]
    folders = results[1]
  } catch (err) {
    console.error('Study page data fetch error:', err)
  }

  return (
    <div className="study-shell">
      <div className="study-header">
        <Card compact>
          <SectionHeader title="Study mode" description="Pick your set, mode and session length." />
        </Card>
      </div>

      {decks.docs.length === 0 ? (
        <Card>
          <p className="p-muted" style={{ marginBottom: '12px' }}>No sets available yet.</p>
          <Link href="/create"><Button>Create your first set</Button></Link>
        </Card>
      ) : (
        <StartSessionForm
          decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
          folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
        />
      )}
    </div>
  )
}
