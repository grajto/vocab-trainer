import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/src/lib/getUser'
import { StatsView } from './StatsView'

export default async function StatsPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">Vocab Trainer</Link>
      </nav>
      <main className="max-w-2xl mx-auto p-4 mt-6 space-y-6">
        <h2 className="text-2xl font-bold">Statistics</h2>
        <StatsView />
      </main>
    </div>
  )
}
