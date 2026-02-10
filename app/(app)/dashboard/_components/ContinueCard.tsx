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
      <div className="absolute -bottom-8 right-0 h-28 w-44 rounded-tl-[42px] bg-[#eef2ff]" />

      <div className="relative z-10">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h4 className="line-clamp-1 text-2xl font-semibold tracking-tight text-slate-800">{item.deckName}</h4>
          <button type="button" className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Więcej opcji">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-200">
          <div className="h-3 rounded-full bg-emerald-500" style={{ width: `${item.progressPercent}%` }} />
        </div>

        <p className="mt-2 text-sm font-medium text-slate-500">{item.progressMeta}</p>

        <div className="mt-4 flex items-center justify-between">
          <Link href={item.resumeHref} className="inline-flex min-h-10 items-center rounded-full bg-[#eef1ff] px-4 text-sm font-semibold text-[#4255ff] hover:bg-[#e3e8ff]">
            Continue
          </Link>
          <span className="text-xs text-slate-400">{item.date}</span>
        </div>
      </div>
    </SimpleCard>
  )
}
