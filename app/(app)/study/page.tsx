/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from '@/app/(app)/learn/StartSessionForm'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'
import { Card } from '../_components/ui/Card'

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
    <PageContainer>
      <PageHeader title="Ucz się" icon={BookOpen} />

      {decks.docs.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="mb-2 text-sm text-[var(--text-muted)]">Brak dostępnych zestawów.</p>
            <Link href="/create" className="text-sm font-medium text-[var(--primary)]">Utwórz pierwszy zestaw</Link>
          </div>
        </Card>
      ) : (
        <Card>
          <StartSessionForm
          decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
          folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
        />
        </Card>
      )}
    </PageContainer>
  )
}
