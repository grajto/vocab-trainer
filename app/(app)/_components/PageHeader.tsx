import type { LucideIcon } from 'lucide-react'
import { IconSquare } from './ui/IconSquare'

export function PageHeader({
  title,
  description,
  icon: Icon,
}: {
  title: string
  description?: string
  icon: LucideIcon
}) {
  return (
    <div className="flex items-center gap-3">
      <IconSquare variant="primary" size="md">
        <Icon size={20} />
      </IconSquare>
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
