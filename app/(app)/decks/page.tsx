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
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Decks</h2>
      
      <CreateDeckForm />

      <div className="space-y-2">
        {decks.docs.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No decks yet. Create one above.</p>
        ) : (
          decks.docs.map(deck => (
            <Link key={deck.id} href={`/decks/${deck.id}`} prefetch={true} className="block bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all">
              <p className="font-medium text-slate-900">{deck.name}</p>
              {deck.description && <p className="text-sm text-slate-400 mt-0.5">{deck.description}</p>}
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
