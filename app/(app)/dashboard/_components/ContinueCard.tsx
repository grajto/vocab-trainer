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
    <SimpleCard className="p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="line-clamp-1 text-xl font-semibold tracking-tight text-slate-900">{item.deckName}</h4>
        <button type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Więcej opcji">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${item.progressPercent}%` }} />
      </div>

      <p className="mt-2 text-sm text-slate-500">{item.progressMeta}</p>

      <div className="mt-3 flex items-center justify-between">
        <Link href={item.resumeHref} className="inline-flex min-h-10 items-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
          Kontynuuj
        </Link>
        <span className="text-xs text-slate-400">{item.date}</span>
      </div>
    </SimpleCard>
  )
}
