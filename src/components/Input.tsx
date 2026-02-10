import type { InputHTMLAttributes } from 'react'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-vt border border-vt-border bg-vt-surface px-4 py-3 text-vt-text placeholder:text-vt-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary ${className}`}
    />
  )
}
