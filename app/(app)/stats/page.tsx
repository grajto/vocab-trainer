import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)' }}>
      <h2 className="text-[.875rem] font-semibold" style={{ color: 'var(--gray600)' }}>Statystyki</h2>
      <StatsView />
    </div>
  )
}
