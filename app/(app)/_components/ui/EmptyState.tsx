import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { IconSquare } from './IconSquare'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <IconSquare
        icon={Icon}
        size="lg"
        variant="secondary"
        className="mb-4"
      />
      <h3 className="text-sm font-semibold text-[var(--text)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mb-4 max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  )
}
