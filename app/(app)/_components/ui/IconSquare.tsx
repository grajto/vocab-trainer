import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type IconSquareVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
export type IconSquareSize = 'sm' | 'md' | 'lg' | 'xl'

export interface IconSquareProps {
  icon: LucideIcon
  variant?: IconSquareVariant
  size?: IconSquareSize
  className?: string
  children?: ReactNode
}

export function IconSquare({
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: IconSquareProps) {
  const variantStyles: Record<IconSquareVariant, string> = {
    primary: 'bg-[var(--primary-soft)] text-[var(--primary)]',
    secondary: 'bg-[var(--surface-muted)] text-[var(--text-muted)]',
    success: 'bg-[var(--success-soft)] text-[var(--success)]',
    warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
    info: 'bg-[var(--info-soft)] text-[var(--info)]',
    neutral: 'bg-[var(--surface-muted)] text-[var(--text)]',
  }
  
  const sizeStyles: Record<IconSquareSize, { container: string; icon: number }> = {
    sm: { container: 'w-8 h-8', icon: 16 },
    md: { container: 'w-10 h-10', icon: 20 },
    lg: { container: 'w-12 h-12', icon: 24 },
    xl: { container: 'w-14 h-14', icon: 28 },
  }
  
  const baseStyles = [
    'inline-flex items-center justify-center',
    'rounded-[var(--icon-radius)]',
    'transition-colors duration-200',
    sizeStyles[size].container,
    variantStyles[variant],
    className,
  ].filter(Boolean).join(' ')
  
  return (
    <div className={baseStyles}>
      {children || <Icon size={sizeStyles[size].icon} />}
    </div>
  )
}
