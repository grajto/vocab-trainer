import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-indigo-600">Home</Link>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <h2 className="text-xl font-semibold">Statistics</h2>
        <StatsView />
      </main>
    </div>
  )
}
