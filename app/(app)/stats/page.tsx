import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--container-max)' }}>
      {/* Header - matching folder page style */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
        >
          <BarChart3 size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Statystyki
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Twoje postępy w nauce
          </p>
        </div>
      </div>

      <StatsView />
    </div>
  )
}
