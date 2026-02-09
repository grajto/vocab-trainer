export default function Loading() {
  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="bg-slate-200 rounded-xl h-8 w-48" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-100 rounded-xl h-20" />
        ))}
      </div>
    </div>
  )
}
