import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'
import { AppShell } from '../ui/AppShell'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <AppShell userLabel={user.username || user.email} activePath="/stats">
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Statistics</h2>
        <StatsView />
      </div>
    </AppShell>
  )
}
