import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ChipVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary'

export interface ChipProps {
  children: ReactNode
  variant?: ChipVariant
  icon?: LucideIcon
  className?: string
}

export function Chip({
  children,
  variant = 'neutral',
  icon: Icon,
  className = '',
}: ChipProps) {
  const variantStyles: Record<ChipVariant, string> = {
    success: 'bg-[var(--success-soft)] text-[var(--success-dark)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning-dark)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger-dark)]',
    info: 'bg-[var(--info-soft)] text-[var(--info-dark)]',
    neutral: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
    primary: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  }
  
  const baseStyles = [
    'inline-flex items-center gap-1',
    'px-2.5 py-0.5',
    'rounded-[var(--chip-radius)]',
    'text-xs font-medium',
    variantStyles[variant],
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <span className={baseStyles}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  )
}
