'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'

type JumpBackInItem = {
  deckId: string
  name: string
  mode: string
  sessionId: string
  progress: string
  progressRatio: number
  startedAt: string
}

function modeLabel(mode: string) {
  if (mode === 'abcd') return 'Test wyboru'
  if (mode === 'translate') return 'Tłumaczenie'
  return mode
}

export function JumpBackInList({ initialItems }: { initialItems: JumpBackInItem[] }) {
  const [items, setItems] = useState(initialItems)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  async function removeSession(sessionId: string) {
    setDeletingId(sessionId)
    try {
      const res = await fetch('/api/session/delete', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      if (res.ok) {
        setItems(prev => prev.filter(item => item.sessionId !== sessionId))
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (items.length === 0) {
    return <div className="dash-empty">Brak przerwanych sesji.</div>
  }

  return (
    <div className="jump-grid">
      {items.slice(0, 4).map(item => (
        <article key={item.sessionId} className="jump-card">
          <div className="jump-card__top">
            <h4 className="jump-card__title">{item.name}</h4>
            <button
              type="button"
              className="jump-card__remove"
              onClick={() => removeSession(item.sessionId)}
              disabled={deletingId === item.sessionId}
              aria-label="Usuń sesję"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="jump-card__bar">
            <div className="jump-card__bar-fill" style={{ width: `${item.progressRatio}%` }} />
          </div>

          <p className="jump-card__meta">{item.progressRatio}% ukończone · {modeLabel(item.mode)} · {item.progress}</p>

          <div className="jump-card__actions">
            <Link href={`/session/${item.sessionId}`} className="jump-card__btn">Kontynuuj</Link>
            <span className="jump-card__time">{new Date(item.startedAt).toLocaleDateString('pl-PL')}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
