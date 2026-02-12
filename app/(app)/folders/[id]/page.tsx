/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import { FolderOpen, Plus } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { FolderDeckList } from './FolderDeckList'
import { PageContainer } from '../../_components/PageContainer'
import Link from 'next/link'
import { FolderQuickModeButtons } from './FolderQuickModeButtons'
import { PageHeader } from '../../_components/PageHeader'
import { FolderSettingsDialog } from './FolderSettingsDialog'

export const dynamic = 'force-dynamic'

export default async function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  let folder
  try { folder = await payload.findByID({ collection: 'folders', id, depth: 0 }) } catch { notFound() }
  if (String(folder.owner) !== String(user.id)) notFound()

  const [decks, cardResult, reviewStates, sessions, foldersAll] = await Promise.all([
    payload.find({ collection: 'decks', where: { owner: { equals: user.id }, folder: { equals: id } }, sort: '-updatedAt', limit: 100, depth: 0 }),
    payload.find({ collection: 'cards', where: { owner: { equals: user.id } }, limit: 5000, depth: 0 }),
    payload.find({ collection: 'review-states', where: { owner: { equals: user.id } }, limit: 5000, depth: 0 }),
    payload.find({ collection: 'sessions', where: { owner: { equals: user.id } }, limit: 500, depth: 0 }),
    payload.find({ collection: 'folders', where: { owner: { equals: user.id } }, limit: 200, depth: 0 }),
  ])

  const folderDeckIds = new Set(decks.docs.map((d: any) => String(d.id)))
  const folderCards = cardResult.docs.filter((c: any) => folderDeckIds.has(String(c.deck)))
  const totalCards = folderCards.length

  const rsByCard = new Map(reviewStates.docs.map((r: any) => [String(r.card), r]))
  const knownWellCount = folderCards.filter((c: any) => Number(rsByCard.get(String(c.id))?.level || 0) >= 4).length
  const avgLevel = folderCards.length > 0
    ? Number((folderCards.reduce((sum: number, c: any) => sum + Number(rsByCard.get(String(c.id))?.level || 0), 0) / folderCards.length).toFixed(2))
    : 0

  const folderSessions = sessions.docs.filter((s: any) => folderDeckIds.has(String(s.deck)))
  const totalSessions = folderSessions.length
  const totalMinutes = folderSessions.reduce((sum: number, s: any) => sum + Math.round(Number(s.durationSeconds || 0) / 60), 0)

  const cardsByDeck = new Map<string, number>()
  for (const card of folderCards) cardsByDeck.set(String(card.deck), (cardsByDeck.get(String(card.deck)) || 0) + 1)

  const deckItems = decks.docs.map((d: any) => ({
    id: String(d.id),
    name: d.name,
    description: d.description || '',
    updatedAt: d.updatedAt,
    lastUsed: d.lastUsed || null,
    cardCount: cardsByDeck.get(String(d.id)) || 0,
    folderId: String(d.folder || ''),
  }))

  return (
    <PageContainer className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <PageHeader title={folder.name} description={`${totalCards} pojęć • przez Ciebie`} icon={FolderOpen} />
        <div className="flex items-center gap-2">
          <Link href={`/folders/${id}/add-decks`} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Plus size={14} /> Dodaj zestaw</Link>
          <FolderSettingsDialog folderId={id} initialName={folder.name} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Liczba zestawów', decks.totalDocs],
          ['Łącznie słówek', totalCards],
          ['Dobrze znane', knownWellCount],
          ['Śr. poziom', avgLevel],
          ['Czas nauki', `${totalMinutes} min`],
          ['Liczba sesji', totalSessions],
        ].map((s) => (
          <div key={String(s[0])} className="rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s[0]}</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{String(s[1])}</p>
          </div>
        ))}
      </div>

      <div className="pt-1"><FolderQuickModeButtons folderId={id} cardCount={totalCards} /></div>
      <FolderDeckList decks={deckItems} folders={foldersAll.docs.map((f: any) => ({ id: String(f.id), name: f.name }))} />
    </PageContainer>
  )
}
