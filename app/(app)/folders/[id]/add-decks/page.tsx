/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FolderPlus } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { PageContainer } from '../../../_components/PageContainer'
import Link from 'next/link'
import { AddDeckToFolderButton } from './AddDeckToFolderButton'

export const dynamic = 'force-dynamic'

export default async function AddDecksToFolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()
  
  // Get the folder
  let folder
  try { 
    folder = await payload.findByID({ collection: 'folders', id, depth: 0 }) 
  } catch { 
    notFound() 
  }
  if (String(folder.owner) !== String(user.id)) notFound()

  // Get all decks owned by user
  const allDecks = await payload.find({ 
    collection: 'decks', 
    where: { owner: { equals: user.id } }, 
    sort: '-updatedAt', 
    limit: 200, 
    depth: 0 
  })

  // Filter decks that are not in any folder
  const decksWithoutFolder = allDecks.docs.filter((d: any) => !d.folder)

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href={`/folders/${id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:opacity-70"
            style={{ border: '1px solid var(--border)' }}
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              Dodaj zestawy do folderu
            </h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {folder.name}
            </p>
          </div>
        </div>
      </div>

      {decksWithoutFolder.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Wszystkie Twoje zestawy są już w folderach lub nie masz jeszcze zestawów poza folderami.
          </p>
          <Link 
            href="/create" 
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
          >
            Utwórz nowy zestaw
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Zestawy bez folderu ({decksWithoutFolder.length})
          </p>
          
          {decksWithoutFolder.map((deck: any) => (
            <div 
              key={deck.id}
              className="flex items-center justify-between gap-4 rounded-xl border p-4"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium" style={{ color: 'var(--text)' }}>
                  {deck.name}
                </p>
                {deck.description && (
                  <p className="truncate text-xs" style={{ color: 'var(--text-muted)' }}>
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
