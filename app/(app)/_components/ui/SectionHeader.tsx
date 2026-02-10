import type { ReactNode } from 'react'

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="h2">{title}</h2>
        {description ? <p className="p-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
