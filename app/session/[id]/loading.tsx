export default function SessionLoading() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="px-6 py-3" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="h-3 w-12 rounded-full" style={{ background: 'var(--surface2)' }} />
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--surface2)' }} />
            <div className="h-3 w-10 rounded-full" style={{ background: 'var(--surface2)' }} />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6px,1fr))] gap-1">
            {Array.from({ length: 24 }).map((_, idx) => (
              <span key={idx} className="h-1 rounded-full" style={{ background: 'var(--surface2)' }} />
            ))}
          </div>
        </div>
      </div>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center space-y-6">
          <div className="h-3 w-24 rounded-full mx-auto" style={{ background: 'var(--surface2)' }} />
          <div className="h-10 w-3/4 rounded-full mx-auto" style={{ background: 'var(--surface2)' }} />
          <div className="h-48 w-full rounded-[var(--radius)]" style={{ background: 'var(--surface2)' }} />
        </div>
      </main>
    </div>
  )
}
