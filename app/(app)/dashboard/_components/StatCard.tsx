import { SimpleCard } from './SimpleCard'

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <SimpleCard className="p-4">
      <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="mt-1 text-[28px] font-bold tracking-tight" style={{ color: 'var(--text)' }}>{value}</p>
    </SimpleCard>
  )
}
