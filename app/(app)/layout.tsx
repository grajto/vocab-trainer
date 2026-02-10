/* eslint-disable @typescript-eslint/no-explicit-any */
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { AppShell } from './_components/AppShell'

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
      limit: 20,
      depth: 0,
    })
    folderList = folders.docs.map((f: any) => ({ id: String(f.id), name: f.name }))
  } catch (err) {
    console.error('Layout folders fetch error (migration may be pending):', err)
  }

  const username = (user as Record<string, unknown>).username as string || (user as Record<string, unknown>).email as string || 'user'

  return (
    <AppShell username={username} folders={folderList}>
      {children}
    </AppShell>
  )
}
