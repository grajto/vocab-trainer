import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`rounded-vt bg-vt-surface shadow-vt-card border border-vt-border ${className}`} />
}
