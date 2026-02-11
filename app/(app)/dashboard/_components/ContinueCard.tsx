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
    <SimpleCard className="relative overflow-hidden p-5 min-h-[180px] flex flex-col justify-between">
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="line-clamp-2 text-lg font-semibold tracking-tight leading-snug" style={{ color: 'var(--text)' }}>{item.deckName}</h4>
          <button type="button" className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--gray400)' }} aria-label="Więcej opcji">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mb-3">
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: '#e9edf7' }}>
            <div className="h-full rounded-full bg-[#22c55e] transition-all" style={{ width: `${item.progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--muted)' }}>{item.progressMeta}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3">
        <Link
          href={item.resumeHref}
          className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          Kontynuuj
        </Link>
        <span className="text-xs font-medium" style={{ color: 'var(--gray400)' }}>{item.date}</span>
      </div>
    </SimpleCard>
  )
}
