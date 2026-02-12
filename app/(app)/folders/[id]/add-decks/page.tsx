/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { PageContainer } from '../../../_components/PageContainer'
import { PageHeader } from '../../../_components/PageHeader'
import { FolderOpen } from 'lucide-react'
import { AddDeckToFolderButton } from './AddDeckToFolderButton'

export const dynamic = 'force-dynamic'

export default async function AddDecksToFolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  
  // Get folder
  let folder
  try { 
    folder = await payload.findByID({ collection: 'folders', id, depth: 0 }) 
  } catch { 
    notFound() 
  }
  if (String(folder.owner) !== String(user.id)) notFound()

  // Get all user's decks
  const allDecks = await payload.find({ 
    collection: 'decks', 
    where: { owner: { equals: user.id } }, 
    sort: '-updatedAt', 
    limit: 200, 
    depth: 0 
  })

  // Filter decks that are NOT in ANY folder
  const decksNotInFolders = allDecks.docs.filter((d: any) => !d.folder)

  return (
    <PageContainer className="space-y-6">
      <PageHeader 
        title="Dodaj zestawy do folderu" 
        description={`Wybierz zestawy, które chcesz dodać do folderu "${folder.name}"`} 
        icon={FolderOpen} 
      />

      {decksNotInFolders.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nie masz żadnych zestawów poza folderami.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {decksNotInFolders.map((deck: any) => (
            <div 
              key={deck.id} 
              className="rounded-xl border p-4 flex items-start justify-between gap-3"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                  {deck.name}
                </h3>
                {deck.description && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {deck.description}
                  </p>
                )}
              </div>
              <AddDeckToFolderButton deckId={String(deck.id)} folderId={id} />
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
