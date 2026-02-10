import { SimpleCard } from './SimpleCard'

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <SimpleCard>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
    </SimpleCard>
  )
}
