/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FolderOpen, Plus } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { Card } from '@/app/(app)/_components/ui/Card'
import { ListRow } from '@/app/(app)/_components/ui/ListRow'
import { Button } from '@/app/(app)/_components/ui/Button'
import { PageHeader } from '../_components/PageHeader'

export const dynamic = 'force-dynamic'

export default async function FoldersPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let folders: any = { docs: [] }
  let decks: any = { docs: [] }
  let cards: any = { docs: [] }

  try {
    const results = await Promise.all([
      payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, sort: '-createdAt', limit: 100, depth: 0 }),
      payload.find({ collection: 'decks', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
    ])
    folders = results[0]
    decks = results[1]
    if (decks.docs.length > 0) {
      cards = await payload.find({ collection: 'cards', where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } }, limit: 2000, depth: 0 })
    }
  } catch (err) {
    console.error('Folders page data fetch error:', err)
  }

  const cardsByDeck = new Map<string, number>()
  for (const card of cards.docs) cardsByDeck.set(String(card.deck), (cardsByDeck.get(String(card.deck)) || 0) + 1)

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      <PageHeader title="Foldery" description="Organizuj zestawy w przejrzystych folderach" icon={FolderOpen} />

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Twoje foldery</p>
          <Link href="/library?tab=folders&create=true"><Button><Plus size={16} />Nowy folder</Button></Link>
        </div>

        <div className="list">
          {folders.docs.length === 0 ? (
            <p className="p-muted">Nie masz jeszcze folderów.</p>
          ) : folders.docs.map((folder: any) => {
            const folderDecks = decks.docs.filter((d: any) => String(d.folder) === String(folder.id))
            const cardCount = folderDecks.reduce((sum: number, d: any) => sum + (cardsByDeck.get(String(d.id)) || 0), 0)
            return (
              <ListRow
                key={folder.id}
                title={<Link href={`/folders/${folder.id}`}>{folder.name}</Link>}
                meta={`${folderDecks.length} zestawów • ${cardCount} słówek`}
                actions={<Link href={`/folders/${folder.id}`}><Button variant="secondary">Otwórz</Button></Link>}
              />
            )
          })}
        </div>
      </Card>
    </div>
  )
}
