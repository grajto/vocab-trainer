import type { SelectHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string
  error?: string
  icon?: LucideIcon
  fullWidth?: boolean
  helperText?: string
  options?: SelectOption[]
}

export function Select({
  label,
  error,
  icon: Icon,
  fullWidth = false,
  helperText,
  disabled,
  options = [],
  className = '',
  children,
  ...props
}: SelectProps) {
  const hasError = Boolean(error)
  
  const selectClasses = [
    'h-10 px-3 py-2',
    'pr-10', // Space for chevron
    'rounded-[var(--input-radius)]',
    'border border-[var(--border)]',
    'bg-[var(--surface)]',
    'text-[var(--text)]',
    'transition-colors duration-200',
    'focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'appearance-none cursor-pointer',
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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)] pointer-events-none z-10">
            <Icon size={16} />
          </div>
        )}
        <select
          className={selectClasses}
          disabled={disabled}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-soft)] pointer-events-none">
          <ChevronDown size={16} />
        </div>
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
