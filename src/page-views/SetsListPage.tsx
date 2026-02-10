import Link from 'next/link'
import { Card } from '@/src/components/Card'
import type { SetSummary } from '@/src/utils/types'

export function SetsListPage({ sets }: { sets: SetSummary[] }) {
  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-semibold text-vt-text">Your sets</h1>
        <Link href="/create" className="rounded-pill border border-vt-border bg-vt-surface px-5 py-3 font-semibold text-vt-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary">Create set</Link>
      </div>
      <div className="space-y-3">
        {sets.map(set => (
          <Link key={set.id} href={`/decks/${set.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary rounded-vt">
            <Card className="p-6 transition hover:-translate-y-0.5">
              <p className="text-xl font-semibold text-vt-text">{set.name}</p>
              <p className="mt-1 text-sm text-vt-muted">{set.cardCount} cards · {set.updatedLabel}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
