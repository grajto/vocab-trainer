/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { Card } from '@/app/(app)/_components/ui/Card'
import { SectionHeader } from '@/app/(app)/_components/ui/SectionHeader'
import { ListRow } from '@/app/(app)/_components/ui/ListRow'
import { Button } from '@/app/(app)/_components/ui/Button'

export const dynamic = 'force-dynamic'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let folder
  try {
    folder = await payload.findByID({ collection: 'folders', id, depth: 0 })
  } catch {
    notFound()
  }
  if (String(folder.owner) !== String(user.id)) notFound()

  const decks = await payload.find({ collection: 'decks', where: { owner: { equals: user.id }, folder: { equals: id } }, sort: 'name', limit: 100, depth: 0 })
  const cardResult = await payload.find({ collection: 'cards', where: { owner: { equals: user.id }, deck: { in: decks.docs.map((d: any) => d.id) } }, limit: 1000, depth: 0 })

  const cardsByDeck = new Map<string, number>()
  for (const card of cardResult.docs) cardsByDeck.set(String(card.deck), (cardsByDeck.get(String(card.deck)) || 0) + 1)

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      <Card>
        <SectionHeader
          title={folder.name}
          description={folder.description || `${decks.totalDocs} decks • ${cardResult.totalDocs} terms`}
          action={<div style={{ display: 'inline-flex', gap: '8px' }}><Link href="/create"><Button>Add set</Button></Link><Button variant="ghost">Rename</Button></div>}
        />
      </Card>

      <section>
        <SectionHeader title="Sets in this folder" />
        <Card>
          <div className="list">
            {decks.docs.length === 0 ? <p className="p-muted">No sets in this folder.</p> : decks.docs.map((deck: any) => (
              <ListRow
                key={deck.id}
                title={deck.name}
                meta={`${cardsByDeck.get(String(deck.id)) || 0} terms`}
                actions={<Link href={`/decks/${deck.id}`}><Button variant="secondary">Open</Button></Link>}
              />
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
