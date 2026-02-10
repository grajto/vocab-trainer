import type { ReactNode } from 'react'

export function ListRow({ title, meta, actions }: { title: ReactNode; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="row">
      <div className="row__main">
        <p className="row__title">{title}</p>
        {meta ? <p className="row__meta">{meta}</p> : null}
      </div>
      {actions ? <div className="row__actions">{actions}</div> : null}
    </div>
  )
}
