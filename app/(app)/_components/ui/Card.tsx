import type { ReactNode } from 'react'

export function Card({
  children,
  compact = false,
  clickable = false,
  className = '',
}: {
  children: ReactNode
  compact?: boolean
  clickable?: boolean
  className?: string
}) {
  return (
    <div className={`card ${compact ? 'card--compact' : 'card--pad'} ${clickable ? 'card--clickable' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}
