import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { ImportForm } from './ImportForm'

export const dynamic = 'force-dynamic'

export default async function ImportPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let decks: any = { docs: [] }
  try {
    decks = await payload.find({
      collection: 'decks',
      where: { owner: { equals: user.id } },
      limit: 100,
      depth: 0,
    })
  } catch (err) {
    console.error('Import page data fetch error (migration may be pending):', err)
  }

  return (
    <div className="p-6 lg:p-8 max-w-lg mx-auto space-y-6">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Import Cards (CSV)</h2>
      {decks.docs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm mb-2" style={{ color: 'var(--gray400)' }}>No decks available.</p>
          <Link href="/decks" prefetch={true} className="text-sm underline underline-offset-2" style={{ color: 'var(--primary)' }}>Create a deck first</Link>
        </div>
      ) : (
        <ImportForm decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))} />
      )}
    </div>
  )
}
