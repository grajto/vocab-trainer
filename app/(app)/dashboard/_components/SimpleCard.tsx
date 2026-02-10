export function SimpleCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white ${className}`}>
      {children}
    </div>
  )
}
