export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="bg-[var(--border)] rounded-[var(--radius)] h-8 w-48" />
      <div className="flex gap-3">
        <div className="bg-[var(--border)] rounded-[var(--radiusSm)] h-9 w-24" />
        <div className="bg-[var(--border)] rounded-[var(--radiusSm)] h-9 w-24" />
        <div className="flex-1 bg-[var(--border)] rounded-[var(--radiusSm)] h-9" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-[var(--surface2)] rounded-[var(--radius)] h-20" />
        ))}
      </div>
    </div>
  )
}
