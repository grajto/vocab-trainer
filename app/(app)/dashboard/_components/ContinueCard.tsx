import Link from 'next/link'
import { MoreVertical } from 'lucide-react'
import { SimpleCard } from './SimpleCard'

export type ContinueItem = {
  deckName: string
  progressPercent: number
  progressMeta: string
  resumeHref: string
  date: string
}

export function ContinueCard({ item }: { item: ContinueItem }) {
  return (
    <SimpleCard className="relative overflow-hidden p-4">
      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h4 className="line-clamp-1 text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>{item.deckName}</h4>
          <button type="button" className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--gray400)' }} aria-label="Więcej opcji">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ background: '#e9edf7' }}>
          <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${item.progressPercent}%` }} />
        </div>

        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>{item.progressMeta}</p>

        <div className="mt-4 flex items-center justify-between">
          <Link
            href={item.resumeHref}
            className="inline-flex min-h-9 items-center rounded-full px-4 text-sm font-semibold"
            style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}
          >
            Kontynuuj
          </Link>
          <span className="text-xs" style={{ color: 'var(--gray400)' }}>{item.date}</span>
        </div>
      </div>
    </SimpleCard>
  )
}
