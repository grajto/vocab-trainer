import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { IconSquare } from './IconSquare'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

export interface CardProps {
  children: ReactNode
  title?: string
  icon?: LucideIcon
  action?: ReactNode
  padding?: CardPadding
  hover?: boolean
  clickable?: boolean
  className?: string
}

export function Card({
  children,
  title,
  icon: Icon,
  action,
  padding = 'md',
  hover = false,
  clickable = false,
  className = '',
}: CardProps) {
  const paddingStyles: Record<CardPadding, string> = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }
  
  const baseStyles = [
    'rounded-[var(--card-radius)]',
    'border border-[var(--border)]',
    'bg-[var(--surface)]',
    'shadow-[var(--shadow-card)]',
    'transition-all duration-200',
    hover && 'hover:shadow-[var(--shadow-hover)] hover:border-[var(--primary-soft)]',
    clickable && 'cursor-pointer',
    paddingStyles[padding],
    className,
  ].filter(Boolean).join(' ')

  const hasHeader = Boolean(title || Icon || action)

  return (
    <div className={baseStyles}>
      {hasHeader && (
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {Icon && <IconSquare icon={Icon} size="sm" variant="primary" />}
            {title && (
              <h3 className="text-base font-semibold text-[var(--text)]">
                {title}
              </h3>
            )}
          </div>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export interface CompactCardProps {
  children: ReactNode
  compact?: boolean
  className?: string
}

export function CompactCard({ children, compact = true, className = '' }: CompactCardProps) {
  const styles = [
    'rounded-[var(--card-radius)]',
    'border border-[var(--border)]',
    'bg-[var(--surface)]',
    compact ? 'p-3' : 'p-5',
    className,
  ].filter(Boolean).join(' ')

  return <div className={styles}>{children}</div>
}
