import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
  
  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-[var(--shadow-md)] focus-visible:ring-[var(--primary)]',
    secondary: 'bg-[var(--surface-muted)] text-[var(--text)] hover:bg-[var(--surface-hover)] shadow-[var(--shadow-sm)] focus-visible:ring-[var(--primary)]',
    outline: 'border border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--primary)]',
    ghost: 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] focus-visible:ring-[var(--primary)]',
    danger: 'bg-[var(--danger)] text-white hover:bg-[var(--danger-dark)] shadow-[var(--shadow-md)] focus-visible:ring-[var(--danger)]',
    success: 'bg-[var(--success)] text-white hover:bg-[var(--success-dark)] shadow-[var(--shadow-md)] focus-visible:ring-[var(--success)]',
  }
  
  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }
  
  const radiusStyle = 'rounded-[var(--button-radius)]'
  const widthStyle = fullWidth ? 'w-full' : ''
  
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${radiusStyle} ${widthStyle} ${className}`.trim()
  
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16
  
  return (
    <button
      className={combinedClassName}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            strokeWidth="3"
            stroke="currentColor"
            strokeOpacity="0.25"
          />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            strokeWidth="3"
            stroke="currentColor"
            strokeLinecap="round"
          />
        </svg>
      )}
      {!loading && Icon && iconPosition === 'left' && <Icon size={iconSize} />}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={iconSize} />}
    </button>
  )
}
