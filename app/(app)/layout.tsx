import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { Sidebar } from './_components/Sidebar'
import { Header } from './_components/Header'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const payload = await getPayload()

  let folderList: { id: string; name: string }[] = []
  try {
    const folders = await payload.find({
      collection: 'folders',
      where: { owner: { equals: user.id } },
      sort: 'name',
      limit: 50,
      depth: 0,
    })
    folderList = folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))
  } catch (err) {
    console.error('Layout folders fetch error (migration may be pending):', err)
  }

  const username = (user as Record<string, unknown>).username as string || (user as Record<string, unknown>).email as string || ''

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar folders={folderList} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header username={username} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
