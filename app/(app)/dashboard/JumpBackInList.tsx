'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlayCircle, Trash2 } from 'lucide-react'
import { useState } from 'react'

type JumpBackInItem = {
  deckId: string
  name: string
  mode: string
  sessionId: string
  progress: string
  startedAt: string
  progressPercent: number
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
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-2xl px-6 py-8 text-center text-sm text-slate-400">
        Brak przerwanych sesji. Zacznij nową naukę.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.slice(0, 6).map(item => (
        <div key={item.sessionId} className="bg-white border border-slate-200 rounded-2xl px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900 truncate pr-2">{item.name}</p>
            <span className="text-xs text-slate-400 capitalize">{item.mode}</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Postęp: {item.progress}</p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.progressPercent}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-2">Ostatnio: {new Date(item.startedAt).toLocaleString('pl-PL')}</p>

          <div className="mt-4 flex items-center gap-2">
            <Link
              href={`/session/${item.sessionId}`}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white bg-indigo-600 px-4 py-2 rounded-full hover:bg-indigo-700"
            >
              <PlayCircle className="w-4 h-4" />
              Kontynuuj
            </Link>
            <button
              type="button"
              onClick={() => removeSession(item.sessionId)}
              disabled={deletingId === item.sessionId}
              className="inline-flex items-center gap-1 text-xs text-rose-600 border border-rose-200 px-3 py-2 rounded-full hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Usuń
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
