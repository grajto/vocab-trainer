import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from './StartSessionForm'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
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
        limit: 100,
        depth: 0,
      }),
      payload.find({
        collection: 'folders',
        where: { owner: { equals: user.id } },
        limit: 100,
        depth: 0,
      }),
    ])
    decks = results[0]
    folders = results[1]
  } catch (err) {
    console.error('Learn page data fetch error (migration may be pending):', err)
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Ucz się</h2>
      {decks.docs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-2">No decks available.</p>
          <Link href="/decks" prefetch={true} className="text-sm text-indigo-600 underline underline-offset-2">Create a deck first</Link>
        </div>
      ) : (
        <StartSessionForm
          decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
          folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
        />
      )}
    </div>
  )
}
