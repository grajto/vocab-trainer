import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { ImportForm } from './ImportForm'
import { AppShell } from '../ui/AppShell'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
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
    <AppShell userLabel={user.username || user.email} activePath="/library">
      <div className="max-w-2xl space-y-4">
        <h2 className="text-2xl font-semibold">Import Cards (CSV)</h2>
        {decks.docs.length === 0 ? (
          <div className="text-center py-8 bg-white border border-neutral-200 rounded-2xl">
            <p className="text-sm text-neutral-400 mb-2">No decks available.</p>
            <Link href="/decks" className="text-sm text-blue-600">Create a deck first</Link>
          </div>
        ) : (
          <ImportForm decks={decks.docs.map(d => ({ id: String(d.id), name: d.name }))} />
        )}
      </div>
    </AppShell>
  )
}
