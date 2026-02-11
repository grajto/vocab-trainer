import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'
import { PageHeader } from '../_components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)', paddingTop: '32px' }}>
      <PageHeader
        icon={BarChart3}
        title="Statystyki"
        subtitle="Twoje postępy w nauce"
      />

      <StatsView />
    </div>
  )
}
