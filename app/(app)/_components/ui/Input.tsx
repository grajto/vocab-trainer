import type { InputHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: LucideIcon
  fullWidth?: boolean
  helperText?: string
}

export function Input({
  label,
  error,
  icon: Icon,
  fullWidth = false,
  helperText,
  disabled,
  className = '',
  ...props
}: InputProps) {
  const hasError = Boolean(error)
  
  const inputClasses = [
    'h-10 px-3 py-2',
    'rounded-[var(--input-radius)]',
    'border border-[var(--border)]',
    'bg-[var(--surface)]',
    'text-[var(--text)]',
    'placeholder:text-[var(--text-soft)]',
    'transition-colors duration-200',
    'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    hasError && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
    Icon && 'pl-10',
    fullWidth && 'w-full',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)]">
            <Icon size={16} />
          </div>
        )}
        <input
          className={inputClasses}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && (
        <span className="text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[var(--text-muted)]">
          {helperText}
        </span>
      )}
    </div>
  )
}

export interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  fullWidth?: boolean
  helperText?: string
  rows?: number
}

export function Textarea({
  label,
  error,
  fullWidth = false,
  helperText,
  disabled,
  rows = 4,
  className = '',
  ...props
}: TextareaProps) {
  const hasError = Boolean(error)
  
  const textareaClasses = [
    'px-3 py-2',
    'rounded-[var(--input-radius)]',
    'border border-[var(--border)]',
    'bg-[var(--surface)]',
    'text-[var(--text)]',
    'placeholder:text-[var(--text-soft)]',
    'transition-colors duration-200',
    'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'resize-vertical',
    hasError && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20',
    fullWidth && 'w-full',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <textarea
        className={textareaClasses}
        disabled={disabled}
        rows={rows}
        {...props}
      />
      {error && (
        <span className="text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[var(--text-muted)]">
          {helperText}
        </span>
      )}
    </div>
  )
}
