'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { PageContainer } from '../_components/PageContainer'
import { PageHeader } from '../_components/PageHeader'

type DayInfo = {
  date: string
  sessions: number
  minutes: number
  status: 'met' | 'partial' | 'none'
  items: Array<{
    id: string
    mode: string
    deckName: string
    accuracy: number | null
    minutes: number
    startedAt: string
    endedAt: string | null
  }>
}

export default function CalendarPage() {
  const today = new Date()
  const [month, setMonth] = useState(today.getMonth())
  const [year, setYear] = useState(today.getFullYear())
  const [days, setDays] = useState<DayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DayInfo | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/calendar?month=${month}&year=${year}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setDays(data.days || [])
        setSelected(null)
      })
      .finally(() => setLoading(false))
  }, [month, year])

  const firstDay = new Date(year, month, 1)
  const startWeekday = (firstDay.getDay() + 6) % 7
  const monthName = firstDay.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1)
    setMonth(next.getMonth())
    setYear(next.getFullYear())
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Kalendarz" icon={CalendarIcon} />
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="rounded-[var(--chip-radius)] p-2 hover:bg-[var(--surface-muted)]" style={{ border: '1px solid var(--border)' }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium capitalize text-[var(--text)]">{monthName}</span>
          <button onClick={() => changeMonth(1)} className="rounded-[var(--chip-radius)] p-2 hover:bg-[var(--surface-muted)]" style={{ border: '1px solid var(--border)' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-[var(--text-soft)]">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map(day => (
          <div key={day} className="text-center">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startWeekday }).map((_, idx) => (
          <div key={`empty-${idx}`} />
        ))}
        {loading ? (
          Array.from({ length: 28 }).map((_, idx) => (
            <div key={`skeleton-${idx}`} className="h-16 rounded-[var(--chip-radius)] animate-pulse" style={{ background: 'var(--surface-muted)' }} />
          ))
        ) : (
          days.map(day => {
            const dateNum = Number(day.date.split('-')[2])
            const bgColor = day.status === 'met' ? 'var(--success-soft)' : day.status === 'partial' ? 'var(--warning-soft)' : 'var(--surface-muted)'
            const textColor = day.status === 'met' ? 'var(--success)' : day.status === 'partial' ? 'var(--warning)' : 'var(--text-soft)'
            return (
              <button
                key={day.date}
                onClick={() => setSelected(day)}
                className="h-16 rounded-[var(--chip-radius)] text-left px-2 py-1.5 hover:opacity-80"
                style={{ background: bgColor, border: '1px solid var(--border)', color: textColor }}
              >
                <div className="text-xs font-semibold">{dateNum}</div>
                <div className="text-[10px] mt-1">{day.sessions} sesji</div>
              </button>
            )
          })
        )}
      </div>

      <div className="rounded-[var(--card-radius)] p-5" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">{selected.date}</p>
              <p className="text-xs text-[var(--text-soft)]">{selected.sessions} sesji · {selected.minutes} min</p>
            </div>
            {selected.items.length === 0 ? (
              <p className="text-sm text-[var(--text-soft)]">Brak sesji.</p>
            ) : (
              <div className="space-y-2">
                {selected.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-[var(--text)]">{item.deckName}</p>
                      <p className="text-xs capitalize text-[var(--text-soft)]">{item.mode} · {item.minutes} min</p>
                    </div>
                    <span className="text-xs font-semibold text-[var(--primary)]">{item.accuracy ?? 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-soft)]">Kliknij dzień, aby zobaczyć szczegóły.</p>
        )}
      </div>
    </PageContainer>
  )
}
