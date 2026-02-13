import type { ReactNode } from 'react'

export function Chip({
  children,
  variant = 'default',
  className = '',
}: {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}) {
  const styles: Record<string, { bg: string; color: string }> = {
    default: { bg: 'var(--primary-soft)', color: 'var(--primary)' },
    success: { bg: 'var(--success-soft)', color: 'var(--success)' },
    warning: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    danger: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
  }

  const style = styles[variant]

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--xs)',
        padding: '4px 12px',
        borderRadius: 'var(--button-radius)',
        background: style.bg,
        color: style.color,
        fontSize: '0.75rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
