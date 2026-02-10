export function SimpleCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl bg-[var(--surface)] ${className}`} style={{ border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
      {children}
    </div>
  )
}
