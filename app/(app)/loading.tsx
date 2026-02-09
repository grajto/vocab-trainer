export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-pulse">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-slate-200 rounded-2xl h-28" />
        ))}
      </div>
      <div className="bg-slate-200 rounded-2xl h-14" />
      <div className="space-y-3">
        <div className="bg-slate-200 rounded-xl h-6 w-32" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-100 rounded-xl h-24" />
          ))}
        </div>
      </div>
    </div>
  )
}
