'use client'

import Link from 'next/link'
import { MoreVertical, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { SimpleCard } from './SimpleCard'
import { ProgressBar } from '../../_components/ui/ProgressBar'

export type ContinueItem = {
  sessionId: string
  deckId?: string
  deckName: string
  progressPercent: number
  progressMeta: string
  resumeHref: string
  date: string
  mode?: string
  targetCount?: number
  direction?: string
}

export function ContinueCard({ item, onRemove }: { item: ContinueItem; onRemove: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <SimpleCard className="relative overflow-hidden p-5 min-h-[220px] flex flex-col justify-between">
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(prev => !prev)}
              className="rounded-md p-1 hover:bg-[var(--surface-muted)]"
              style={{ color: 'var(--text-soft)' }}
              aria-label="Więcej opcji"
            >
              <MoreVertical size={16} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-7 z-10 w-48 rounded-lg border shadow-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onRemove()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--hover-bg)]"
                  style={{ color: 'var(--danger)' }}
                >
                  <Trash2 size={14} />
                  Usuń z historii
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <ProgressBar value={item.progressPercent} className="h-3" />
          <p className="mt-2 text-xs font-semibold" style={{ color: 'var(--text)' }}>{item.progressMeta}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3">
        <Link
          href={item.resumeHref}
          className="inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          Kontynuuj
        </Link>
        <span className="text-xs font-medium" style={{ color: 'var(--text-soft)' }}>{item.date}</span>
      </div>
    </SimpleCard>
  )
}
