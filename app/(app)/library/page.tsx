import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { LibraryTabs } from './LibraryTabs'

export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decks: any = { docs: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let folders: any = { docs: [] }

  try {
    const results = await Promise.all([
      payload.find({
        collection: 'decks',
        where: { owner: { equals: user.id } },
        sort: '-updatedAt',
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'folders',
        where: { owner: { equals: user.id } },
        sort: 'name',
        limit: 100,
        depth: 0,
      }),
    ])
    decks = results[0]
    folders = results[1]
  } catch (err) {
    console.error('Library page data fetch error (migration may be pending):', err)
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Your library</h2>
      <LibraryTabs
        decks={decks.docs.map((d: any) => ({
          id: String(d.id),
          name: d.name,
          description: d.description || '',
          folder: d.folder ? String(d.folder) : null,
        }))}
        folders={folders.docs.map((f: any) => ({
          id: String(f.id),
          name: f.name,
          description: f.description || '',
        }))}
      />
    </div>
  )
}
