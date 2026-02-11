/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'
import { TestList } from './TestList'

export const dynamic = 'force-dynamic'

export default async function TestPage() {
  const user = await getUser()
  if (!user) redirect('/login')
  const payload = await getPayload()

  const [decks, folders] = await Promise.all([
    payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, sort: 'name', limit: 300, depth: 0 }),
    payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, sort: 'name', limit: 300, depth: 0 }),
  ])

  return (
    <PageContainer>
      <PageHeader title="Testy" description="Twórz testy z zestawów i folderów, śledź wyniki i ranking." icon={ClipboardCheck} />
      <TestList
        decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
        folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
      />
    </PageContainer>
  )
}
