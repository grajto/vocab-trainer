import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <PageHeader title="Statystyki" icon={BarChart3} />

      <StatsView />
    </PageContainer>
  )
}
