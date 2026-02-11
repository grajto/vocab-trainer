export function ProgressBar({
  value,
  trackColor = '#e9edf7',
  fill = 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
  className = 'h-3',
}: {
  value: number
  trackColor?: string
  fill?: string
  className?: string
}) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))

  return (
    <div className={`w-full overflow-hidden rounded-full ${className}`} style={{ background: trackColor }}>
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${safe}%`,
          background: fill,
        }}
      />
    </div>
  )
}
