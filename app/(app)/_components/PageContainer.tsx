import type { ReactNode } from 'react'

export function PageContainer({ children, maxWidth = 'var(--container-max)', className = '' }: { children: ReactNode; maxWidth?: string; className?: string }) {
  return (
    <div className={`mx-auto w-full space-y-6 ${className}`.trim()} style={{ maxWidth }}>
      {children}
    </div>
  )
}
