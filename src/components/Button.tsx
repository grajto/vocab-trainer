import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'soft'

export function Button({ className = '', variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantClasses = {
    primary: 'bg-vt-primary text-white hover:brightness-105',
    ghost: 'bg-transparent text-vt-text hover:bg-vt-soft',
    soft: 'bg-vt-soft text-vt-text hover:bg-vt-border/60',
  }

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-pill px-6 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary focus-visible:ring-offset-2 disabled:opacity-50 ${variantClasses[variant]} ${className}`}
    />
  )
}
