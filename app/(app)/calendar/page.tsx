'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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
    <div className="p-8 lg:p-10 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kalendarz nauki</h2>
          <p className="text-sm text-slate-400">Śledź aktywność i streak</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg border border-slate-200 hover:border-blue-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-700 capitalize">{monthName}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg border border-slate-200 hover:border-blue-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-slate-400">
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
            <div key={`skeleton-${idx}`} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : (
          days.map(day => {
            const dateNum = Number(day.date.split('-')[2])
            const statusColor = day.status === 'met'
              ? 'bg-blue-500 text-white border-blue-500'
              : day.status === 'partial'
                ? 'bg-blue-200 text-blue-700 border-blue-200'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            const isSelected = selected?.date === day.date
            return (
              <button
                key={day.date}
                onClick={() => setSelected(day)}
                className={`h-16 rounded-xl border ${statusColor} text-left px-2 py-1.5 hover:shadow-md transition-all ${
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
              >
                <div className="text-xs font-semibold">{dateNum}</div>
                <div className="text-[10px] mt-1">{day.sessions} sesji</div>
              </button>
            )
          })
        )}
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md">
        {selected ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selected.date}</p>
              <p className="text-xs text-slate-400">{selected.sessions} sesji · {selected.minutes} min</p>
            </div>
            {selected.items.length === 0 ? (
              <p className="text-sm text-slate-400">Brak sesji.</p>
            ) : (
              <div className="space-y-2">
                {selected.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{item.deckName}</p>
                      <p className="text-xs text-slate-400 capitalize">{item.mode} · {item.minutes} min</p>
                    </div>
                    <span className="text-xs text-indigo-600 font-semibold">{item.accuracy ?? 0}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Kliknij dzień, aby zobaczyć szczegóły.</p>
        )}
      </div>
    </div>
  )
}
