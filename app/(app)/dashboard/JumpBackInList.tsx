'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/app/(app)/_components/ui/Button'
import { ListRow } from '@/app/(app)/_components/ui/ListRow'

type JumpBackInItem = {
  name: string
  mode: string
  sessionId: string
  progress: string
  startedAt: string
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
    return <p className="p-muted">No interrupted sessions.</p>
  }

  return (
    <div className="list">
      {items.slice(0, 8).map(item => (
        <ListRow
          key={item.sessionId}
          title={item.name}
          meta={`${item.mode} • progress ${item.progress} • ${new Date(item.startedAt).toLocaleString('pl-PL')}`}
          actions={
            <>
              <Link href={`/session/${item.sessionId}`}><Button variant="primary">Resume</Button></Link>
              <Button variant="ghost" disabled={deletingId === item.sessionId} onClick={() => removeSession(item.sessionId)}>
                Remove
              </Button>
            </>
          }
        />
      ))}
    </div>
  )
}
