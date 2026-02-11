import { redirect } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { DeckCreator } from './DeckCreator'
import { PageHeader } from '../_components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function CreateDeckPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let folders: any = { docs: [] }
  try {
    folders = await payload.find({
      collection: 'folders',
      where: { owner: { equals: user.id } },
      sort: 'name',
      limit: 100,
      depth: 0,
    })
  } catch (err) {
    console.error('Create page data fetch error:', err)
  }

  const folderList = folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      <PageHeader title="Kreator zestawów" description="Utwórz nowy zestaw słówek" icon={PlusCircle} />
      
      <DeckCreator folders={folderList} />
    </div>
  )
}
