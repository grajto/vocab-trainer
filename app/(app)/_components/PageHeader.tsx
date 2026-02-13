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
      <IconSquare icon={Icon} variant="primary" size="md" />
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1 text-[var(--text-muted)]">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
