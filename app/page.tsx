import Link from 'next/link'
import { getUser } from '@/src/lib/getUser'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const user = await getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-white">
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Vocab Trainer</h1>
        <span className="text-sm text-gray-500">{user.email}</span>
      </nav>
      <main className="max-w-2xl mx-auto p-4 space-y-4 mt-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="grid grid-cols-2 gap-4">
          <Link href="/learn" className="block p-6 bg-black text-white rounded-lg text-center font-semibold hover:bg-gray-800">
            Start Learning
          </Link>
          <Link href="/decks" className="block p-6 bg-white text-black border border-gray-300 rounded-lg text-center font-semibold hover:bg-gray-50">
            Decks
          </Link>
          <Link href="/import" className="block p-6 bg-white text-black border border-gray-300 rounded-lg text-center font-semibold hover:bg-gray-50">
            Import CSV
          </Link>
          <Link href="/stats" className="block p-6 bg-white text-black border border-gray-300 rounded-lg text-center font-semibold hover:bg-gray-50">
            Stats
          </Link>
        </div>
      </main>
    </div>
  )
}
