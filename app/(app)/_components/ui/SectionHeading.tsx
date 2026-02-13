import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { IconSquare } from './IconSquare'

export interface SectionHeadingProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function SectionHeading({
  title,
  subtitle,
  icon: Icon,
  action,
  className = '',
}: SectionHeadingProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        {Icon && <IconSquare icon={Icon} size="sm" variant="secondary" />}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-[var(--text)]">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="ml-auto flex-shrink-0">{action}</div>}
    </div>
  )
}
