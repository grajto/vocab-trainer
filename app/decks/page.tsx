import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { CreateDeckForm } from './CreateDeckForm'

export const dynamic = 'force-dynamic'

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
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b border-neutral-200 bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight">Vocab Trainer</Link>
          <span className="text-xs text-neutral-400">{user.email}</span>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Decks</h2>
        
        <CreateDeckForm />

        <div className="space-y-2">
          {decks.docs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No decks yet. Create one above.</p>
          ) : (
            decks.docs.map(deck => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="block bg-white border border-neutral-200 rounded-xl px-5 py-4 hover:border-neutral-400 transition-colors">
                <p className="font-medium">{deck.name}</p>
                {deck.description && <p className="text-sm text-neutral-400 mt-0.5">{deck.description}</p>}
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
