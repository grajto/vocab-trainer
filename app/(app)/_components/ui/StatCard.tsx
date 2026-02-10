import { Card } from './Card'

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card compact>
      <p className="row__meta">{label}</p>
      <p className="h2" style={{ marginTop: '8px' }}>{value}</p>
    </Card>
  )
}
