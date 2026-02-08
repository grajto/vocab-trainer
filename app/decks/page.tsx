import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { CreateDeckForm } from './CreateDeckForm'

export default async function DecksPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  const decks = await payload.find({
    collection: 'decks',
    where: { owner: { equals: user.id } },
    sort: '-createdAt',
    limit: 100,
    depth: 0,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">Vocab Trainer</Link>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>
      <main className="max-w-2xl mx-auto p-4 mt-6 space-y-6">
        <h2 className="text-2xl font-bold">Decks</h2>
        
        <CreateDeckForm />

        <div className="space-y-2">
          {decks.docs.length === 0 ? (
            <p className="text-gray-500">No decks yet. Create one above.</p>
          ) : (
            decks.docs.map(deck => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="block p-4 bg-white rounded-lg shadow hover:shadow-md transition">
                <h3 className="font-semibold">{deck.name}</h3>
                {deck.description && <p className="text-sm text-gray-500 mt-1">{deck.description}</p>}
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
