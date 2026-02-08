import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from './StartSessionForm'

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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">Vocab Trainer</Link>
      </nav>
      <main className="max-w-lg mx-auto p-4 mt-6 space-y-6">
        <h2 className="text-2xl font-bold">Start Learning</h2>
        {decks.docs.length === 0 ? (
          <p className="text-gray-500">No decks available. <Link href="/decks" className="text-blue-600 underline">Create a deck first.</Link></p>
        ) : (
          <StartSessionForm decks={decks.docs.map(d => ({ id: String(d.id), name: d.name }))} />
        )}
      </main>
    </div>
  )
}
