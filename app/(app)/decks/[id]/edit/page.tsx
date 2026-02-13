/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect, notFound } from 'next/navigation'
import { Pencil } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { EditDeckForm } from '../EditDeckForm'
import { PageContainer } from '../../../_components/PageContainer'

export const dynamic = 'force-dynamic'

export default async function EditDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  let deck: any
  try {
    deck = await payload.findByID({ collection: 'decks', id, depth: 0 })
  } catch {
    notFound()
  }
  if (String(deck.owner) !== String(user.id)) notFound()

  let folders: any = { docs: [] }
  try {
    folders = await payload.find({
      collection: 'folders',
      where: { owner: { equals: user.id } },
      sort: 'name',
      limit: 100,
      depth: 0,
    })
  } catch (err) {
    console.error('Edit deck folders fetch error:', err)
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-3 pt-1">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
        >
          <Pencil size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[var(--text)]">
            Edytuj zestaw
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Zaktualizuj nazwę, folder i opis
          </p>
        </div>
      </div>

      <EditDeckForm
        deck={{
          id: String(deck.id),
          name: deck.name,
          description: deck.description,
          folder: deck.folder,
          direction: deck.direction,
        }}
        folders={folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))}
      />
    </PageContainer>
  )
}
