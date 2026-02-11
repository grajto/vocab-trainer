'use client'

import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Calendar } from 'lucide-react'

interface TestSession {
  id: string
  deck: { id: string; name: string } | string
  startedAt: string
  endedAt: string | null
  targetCount: number
  completedCount: number
  accuracy: number
  mode: string
}

export function TestList({ sessions }: { sessions: TestSession[] }) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl py-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
          Nie masz jeszcze żadnych testów.
        </p>
        <Link 
          href="/study"
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-colors"
          style={{ background: 'var(--warning)', color: '#fff' }}
        >
          Rozpocznij pierwszy test
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const deckName = typeof session.deck === 'object' ? session.deck.name : 'Nieznany zestaw'
        const isCompleted = session.endedAt !== null
        const accuracy = Math.round(session.accuracy || 0)
        const date = new Date(session.startedAt).toLocaleDateString('pl-PL', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
        const time = new Date(session.startedAt).toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit'
        })

        return (
          <div
            key={session.id}
            className="rounded-xl p-4"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                    {deckName}
                  </h3>
                  {isCompleted ? (
                    <span 
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ 
                        background: accuracy >= 70 ? '#eaf8ef' : '#fee2e2',
                        color: accuracy >= 70 ? 'var(--success)' : 'var(--danger)'
                      }}
                    >
                      {accuracy >= 70 ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {accuracy}%
                    </span>
                  ) : (
                    <span 
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: '#fff8dd', color: 'var(--warning)' }}
                    >
                      <Clock size={12} />
                      W trakcie
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {date} • {time}
                  </span>
                  <span>
                    {session.completedCount} / {session.targetCount} pytań
                  </span>
                </div>
              </div>

              {isCompleted && (
                <Link
                  href={`/session/${session.id}`}
                  className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors hover:opacity-80"
                  style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
                >
                  Zobacz wyniki
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
