export function SimpleCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--card-radius)] bg-[var(--surface)] ${className}`} style={{ border: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}
