/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { StartSessionForm } from '@/app/(app)/learn/StartSessionForm'

export const dynamic = 'force-dynamic'

export default async function StudyPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let decks: any = { docs: [] }
  let folders: any = { docs: [] }
  try {
    const results = await Promise.all([
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 100, depth: 0 }),
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 100, depth: 0 }),
    ])
    decks = results[0]
    folders = results[1]
  } catch (err) {
    console.error('Study page data fetch error:', err)
  }

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)' }}>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>Ucz się</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Wybierz zestaw, tryb i długość sesji.</p>
      </div>

      {decks.docs.length === 0 ? (
        <div className="rounded-lg py-12 text-center" style={{ border: '1px solid var(--border)' }}>
          <p className="mb-2 text-sm" style={{ color: 'var(--muted)' }}>Brak dostępnych zestawów.</p>
          <Link href="/create" className="text-sm font-medium" style={{ color: 'var(--primary)' }}>Utwórz pierwszy zestaw</Link>
        </div>
      ) : (
        <StartSessionForm
          decks={decks.docs.map((d: any) => ({ id: String(d.id), name: d.name }))}
          folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
        />
      )}
    </div>
  )
}
