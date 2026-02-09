// Alias: /study/start → same as /learn
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from '@/app/(app)/learn/StartSessionForm'

export const dynamic = 'force-dynamic'

export default async function StudyStartPage() {
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
    console.error('Study start data fetch error (migration may be pending):', err)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-indigo-600">Home</Link>
        </div>
      </nav>
      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-semibold text-slate-900">Start Learning</h2>
        {decks.docs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400 mb-2">No decks available.</p>
            <Link href="/decks" className="text-sm text-indigo-600 underline underline-offset-2">Create a deck first</Link>
          </div>
        ) : (
          <StartSessionForm
            decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
            folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
          />
        )}
      </main>
    </div>
  )
}
