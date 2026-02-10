import Link from 'next/link'
import { Card } from '@/src/components/Card'
import { Button } from '@/src/components/Button'

export function HomePage({ streak, sessionsToday, cardsReady }: { streak: number; sessionsToday: number; cardsReady: number }) {
  return (
    <div className="space-y-6 p-4 lg:p-8">
      <h1 className="text-4xl font-semibold text-vt-text">Welcome back</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6"><p className="text-sm text-vt-muted">Current streak</p><p className="mt-2 text-3xl font-semibold text-vt-text">{streak} days</p></Card>
        <Card className="p-6"><p className="text-sm text-vt-muted">Sessions today</p><p className="mt-2 text-3xl font-semibold text-vt-text">{sessionsToday}</p></Card>
        <Card className="p-6"><p className="text-sm text-vt-muted">Cards ready</p><p className="mt-2 text-3xl font-semibold text-vt-text">{cardsReady}</p></Card>
      </div>
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-vt-text">Jump into study</h2>
        <p className="mt-2 text-vt-muted">Start a new test or continue your learning mode.</p>
        <div className="mt-4 flex gap-3">
          <Link href="/study/start"><Button>Start study</Button></Link>
          <Link href="/decks"><Button variant="soft">Browse sets</Button></Link>
        </div>
      </Card>
    </div>
  )
}
