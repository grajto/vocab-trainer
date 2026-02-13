export function SegmentedProgressBar({
  current,
  total,
  segments = 10,
}: {
  current: number
  total: number
  segments?: number
}) {
  const progress = Math.min(100, Math.max(0, (current / total) * 100))
  const activeSegments = Math.floor((progress / 100) * segments)

  return (
    <div className="flex items-center gap-3">
      {/* Left badge - current value */}
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: 'var(--success)' }}
      >
        {current}
      </div>

      {/* Segmented progress bar */}
      <div className="flex flex-1 gap-1">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="h-2 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i < activeSegments ? 'var(--success)' : 'var(--surface-muted)',
            }}
          />
        ))}
      </div>

      {/* Right badge - total value */}
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
        style={{
          border: '1.5px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text-muted)',
        }}
      >
        {total}
      </div>
    </div>
  )
}
