import type { ReactNode } from 'react'

export function IconSquare({
  children,
  variant = 'primary',
  size = 28,
}: {
  children: ReactNode
  variant?: 'primary' | 'muted'
  size?: number
}) {
  const bg = variant === 'primary' ? 'var(--primary-soft)' : 'var(--surface-muted)'
  const color = variant === 'primary' ? 'var(--primary)' : 'var(--text-muted)'

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--icon-radius)',
        background: bg,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  )
}
