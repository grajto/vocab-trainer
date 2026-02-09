export default function SessionLoading() {
  return (
    <div className="min-h-screen bg-[#0b0b2b] text-slate-100">
      <div className="border-b border-slate-800/60 bg-[#0f1237]/80 px-6 py-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <div className="h-3 w-12 rounded-full bg-slate-700/60" />
            <div className="flex-1 h-2 rounded-full bg-slate-700/60" />
            <div className="h-3 w-10 rounded-full bg-slate-700/60" />
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6px,1fr))] gap-1">
            {Array.from({ length: 24 }).map((_, idx) => (
              <span key={idx} className="h-1 rounded-full bg-slate-700/60" />
            ))}
          </div>
        </div>
      </div>
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center space-y-6">
          <div className="h-3 w-24 bg-slate-700/60 rounded-full mx-auto" />
          <div className="h-10 w-3/4 bg-slate-700/60 rounded-full mx-auto" />
          <div className="h-48 w-full bg-slate-800/60 rounded-2xl" />
        </div>
      </main>
    </div>
  )
}
