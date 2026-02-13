import type { ReactNode } from 'react'

export interface ListRowProps {
  title: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}

export function ListRow({ title, meta, actions, className = '' }: ListRowProps) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors ${className}`.trim()}
    >
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-[var(--text)]">{title}</p>
        {meta ? <p className="m-0 mt-1 text-xs text-[var(--text-muted)]">{meta}</p> : null}
      </div>
      {actions ? <div className="inline-flex shrink-0 gap-2">{actions}</div> : null}
    </div>
  )
}
