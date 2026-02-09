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
  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id } },
    limit: 100,
    depth: 0,
  })

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Vocab Trainer</Link>
        </div>
      </nav>
      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Start Learning</h2>
        {decks.docs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-400 mb-2">No decks available.</p>
            <Link href="/decks" className="text-sm text-neutral-900 underline underline-offset-2">Create a deck first</Link>
          </div>
        ) : (
          <StartSessionForm decks={decks.docs.map(d => ({ id: String(d.id), name: d.name }))} />
        )}
      </main>
    </div>
  )
}
