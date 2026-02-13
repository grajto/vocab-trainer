import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { IconSquare } from './IconSquare'

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div
      className="rounded-[var(--card-radius)] border py-12 text-center"
      style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
    >
      {Icon && (
        <div className="flex justify-center mb-4">
          <IconSquare variant="muted" size={48}>
            <Icon size={24} />
          </IconSquare>
        </div>
      )}
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
        {title}
      </p>
      {description && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      )}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-block px-4 py-2 text-sm font-semibold rounded-full transition-opacity hover:opacity-80"
          style={{ background: 'var(--primary)', color: '#fff' }}
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
