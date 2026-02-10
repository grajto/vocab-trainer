export function SimpleCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}
