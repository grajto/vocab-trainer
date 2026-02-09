import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { CreateDeckForm } from './CreateDeckForm'
import { AppShell } from '../ui/AppShell'

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
    <AppShell userLabel={user.username || user.email} activePath="/library">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Zestawy</h2>
          <Link href="/import" className="text-sm text-blue-600">Importuj</Link>
        </div>

        <CreateDeckForm />

        <div className="grid sm:grid-cols-2 gap-3">
          {decks.docs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-8 text-center">No decks yet. Create one above.</p>
          ) : (
            decks.docs.map(deck => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="block bg-white border border-neutral-200 rounded-2xl px-5 py-4 hover:border-blue-300 transition-colors">
                <p className="font-medium">{deck.name}</p>
                {deck.description && <p className="text-sm text-neutral-400 mt-0.5">{deck.description}</p>}
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}
