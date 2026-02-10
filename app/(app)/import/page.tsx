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
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: '640px' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Import fiszek (CSV)</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Wklej dane w formacie CSV, aby masowo dodać karty.</p>
      </div>

      {decks.docs.length === 0 ? (
        <div className="rounded-lg py-12 text-center" style={{ border: '1px solid var(--border)' }}>
          <p className="mb-2 text-sm" style={{ color: 'var(--muted)' }}>Brak dostępnych zestawów.</p>
          <Link href="/create" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Utwórz zestaw</Link>
        </div>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <ImportForm decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))} />
      )}
    </div>
  )
}
