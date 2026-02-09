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
  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id } },
    limit: 100,
    depth: 0,
  })

  return (
    <div className="p-6 lg:p-8 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Start Learning</h2>
      {decks.docs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-slate-400 mb-2">No decks available.</p>
          <Link href="/decks" prefetch={true} className="text-sm text-indigo-600 underline underline-offset-2">Create a deck first</Link>
        </div>
      ) : (
        <StartSessionForm decks={decks.docs.map(d => ({ id: String(d.id), name: d.name }))} />
      )}
    </div>
  )
}
