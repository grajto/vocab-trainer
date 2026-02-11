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
      {/* Decorative shape in bottom right */}
      <div 
        className="absolute bottom-0 right-0 opacity-10 pointer-events-none"
        style={{
          width: '120px',
          height: '120px',
          background: 'var(--primary)',
          borderRadius: '50% 0 0 0',
          transform: 'translate(20%, 20%)'
        }}
      />
      <div className="relative z-10">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h4 className="line-clamp-2 text-lg font-semibold tracking-tight leading-snug" style={{ color: 'var(--text)' }}>{item.deckName}</h4>
          <button type="button" className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--gray400)' }} aria-label="Więcej opcji">
            <MoreVertical size={16} />
          </button>
        </div>

        <div className="mb-3">
          <div className="h-3 w-full overflow-hidden rounded-full shadow-sm" style={{ background: '#e9edf7' }}>
            <div 
              className="h-full rounded-full transition-all shadow-md" 
              style={{ 
                width: `${item.progressPercent}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
              }} 
            />
          </div>
          <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--text)' }}>{item.progressMeta}</p>
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
