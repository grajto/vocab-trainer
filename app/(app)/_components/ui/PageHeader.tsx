import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
