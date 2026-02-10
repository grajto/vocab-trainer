import { Card } from '@/src/components/Card'
import { Button } from '@/src/components/Button'
import type { StudyCard } from '@/src/utils/types'
import Link from 'next/link'

export function SetDetailPage({ title, description, cards, deckId }: { title: string; description?: string; cards: StudyCard[]; deckId: string }) {
  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-vt-text">{title}</h1>
          {description && <p className="mt-2 text-vt-muted">{description}</p>}
          <p className="mt-2 text-sm text-vt-muted">{cards.length} cards</p>
        </div>
        <Link href={`/study/start?deckId=${deckId}`}><Button>Start test</Button></Link>
      </div>
      <div className="space-y-3">
        {cards.map(card => (
          <Card key={card.id} className="grid gap-4 p-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-vt-muted">Term</p>
              <p className="mt-2 text-2xl text-vt-text">{card.prompt}</p>
            </div>
            <div className="border-t border-vt-border pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
              <p className="text-sm font-semibold text-vt-muted">Definition</p>
              <p className="mt-2 text-2xl text-vt-text">{card.answer}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
