export function Progress({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="h-2 w-full rounded-pill bg-vt-border" aria-label="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className="h-full rounded-pill bg-vt-primary transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}
