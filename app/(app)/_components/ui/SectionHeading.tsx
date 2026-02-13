import type { LucideIcon } from 'lucide-react'
import { IconSquare } from './IconSquare'

export function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon?: LucideIcon
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      {Icon && (
        <IconSquare variant="muted" size={32}>
          <Icon size={16} />
        </IconSquare>
      )}
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
