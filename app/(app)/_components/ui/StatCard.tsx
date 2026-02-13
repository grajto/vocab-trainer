import { Card } from './Card'
import type { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
}

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card padding="sm">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--icon-radius)] bg-[var(--primary-soft)]">
            <Icon size={18} className="text-[var(--primary)]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="m-0 text-xs font-medium text-[var(--text-muted)]">{label}</p>
          <p className="m-0 mt-1 text-xl font-bold text-[var(--text)]">{value}</p>
        </div>
      </div>
    </Card>
  )
}
