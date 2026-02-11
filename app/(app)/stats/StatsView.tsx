'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Clock3, Filter, Layers, LineChart, TrendingUp } from 'lucide-react'

type FilterPreset = '7' | '30' | '90' | 'custom'

type StatsPayload = {
  filters: {
    decks: Array<{ id: string; name: string; folderId?: string }>
    folders: Array<{ id: string; name: string }>
  }
  global: {
    totalSessions: number
    totalCorrect: number
    totalWrong: number
    accuracyPercent: number
    avgSessionMinutes: number
    levelDistribution: Record<string, number>
  }
  activity: Array<{ date: string; sessions: number; minutes: number }>
  modeStats: Array<{ mode: string; count: number }>
  selectedDeckStats: null | {
    deckId: string
    deckName: string
    avgResponseTimeMs: number
    avgSessionMinutes: number
    sessionsCount: number
    correctAnswers: number
    totalAnswers: number
    accuracyPercent: number
    levelDistribution: Record<string, number>
    hardestWords: Array<{ cardId: string; front: string; wrong: number; repeats: number }>
    mostRepeatedWords: Array<{ cardId: string; front: string; wrong: number; repeats: number }>
  }
  sessions: Array<{ id: string; mode: string; deckId: string; deckName: string; startedAt: string; completedCount: number }>
}

export function StatsView() {
  const [data, setData] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(false)

  const [preset, setPreset] = useState<FilterPreset>('30')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [deckId, setDeckId] = useState('')
  const [folderId, setFolderId] = useState('')
  const [mode, setMode] = useState('all')
  const [level, setLevel] = useState('0')

  const query = useMemo(() => {
    const p = new URLSearchParams({ preset, deckId, folderId, mode, level })
    if (preset === 'custom') {
      if (from) p.set('from', from)
      if (to) p.set('to', to)
    }
    return p.toString()
  }, [preset, from, to, deckId, folderId, mode, level])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetch(`/api/stats?${query}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => { if (!ignore) setData(json) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [query])

  if (!data) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{loading ? 'Ładowanie statystyk…' : 'Brak danych.'}</p>

  const cards = [
    { label: 'Sesje', value: data.global.totalSessions, icon: BarChart3 },
    { label: 'Skuteczność', value: `${data.global.accuracyPercent}%`, icon: TrendingUp },
    { label: 'Śr. czas sesji', value: `${data.global.avgSessionMinutes} min`, icon: Clock3 },
    { label: 'Poprawne odp.', value: data.global.totalCorrect, icon: Layers },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2"><Filter size={16} /><p className="text-sm font-semibold">Filtry</p></div>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <select value={preset} onChange={(e) => setPreset(e.target.value as FilterPreset)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="7">7 dni</option><option value="30">30 dni</option><option value="90">90 dni</option><option value="custom">Własny zakres</option>
          </select>
          {preset === 'custom' && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} />
            </>
          )}
          <select value={folderId} onChange={(e) => { setFolderId(e.target.value); setDeckId('') }} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="">Wszystkie foldery</option>
            {data.filters.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="">Wszystkie zestawy</option>
            {data.filters.decks.filter(d => !folderId || d.folderId === folderId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={mode} onChange={(e) => setMode(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="all">Wszystkie tryby</option><option value="abcd">ABCD</option><option value="translate">Translated</option><option value="sentence">Sentence</option><option value="describe">Described</option>
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            <option value="0">Wszystkie poziomy</option>
            {[0,1,2,3,4,5].map((l) => <option key={l} value={String(l)}>Poziom {l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <c.icon size={16} />
            <p className="mt-2 text-xl font-bold">{c.value}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-3 text-sm font-semibold">Aktywność w czasie</p>
          <div className="space-y-2">
            {data.activity.slice(-14).map((a) => (
              <div key={a.date} className="flex items-center gap-2">
                <span className="w-24 text-xs" style={{ color: 'var(--text-muted)' }}>{a.date}</span>
                <div className="h-2 flex-1 rounded-full" style={{ background: 'var(--surface2)' }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, a.sessions * 12)}%`, background: 'var(--primary)' }} /></div>
                <span className="w-8 text-right text-xs">{a.sessions}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-3 text-sm font-semibold">Rozkład poziomów znajomości</p>
          <div className="space-y-2">
            {Object.entries(data.global.levelDistribution).map(([lvl, count]) => (
              <div key={lvl} className="flex items-center gap-2">
                <span className="w-16 text-xs">L{lvl}</span>
                <div className="h-2 flex-1 rounded-full" style={{ background: 'var(--surface2)' }}><div className="h-2 rounded-full" style={{ width: `${Math.min(100, Number(count) * 4)}%`, background: '#22c55e' }} /></div>
                <span className="w-8 text-right text-xs">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-3 text-sm font-semibold">Statystyki trybów</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.modeStats.map((m) => (
            <div key={m.mode} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
              <p className="font-semibold">{m.mode}</p>
              <p style={{ color: 'var(--text-muted)' }}>{m.count} sesji</p>
            </div>
          ))}
        </div>
      </div>

      {data.selectedDeckStats ? (
        <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2"><LineChart size={16} /><h3 className="text-base font-semibold">Szczegółowe statystyki: {data.selectedDeckStats.deckName}</h3></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Śr. czas/słówko" value={`${Math.round(data.selectedDeckStats.avgResponseTimeMs / 1000)} s`} />
            <Stat label="Śr. czas sesji" value={`${data.selectedDeckStats.avgSessionMinutes} min`} />
            <Stat label="Liczba sesji" value={data.selectedDeckStats.sessionsCount} />
            <Stat label="Poprawne odpowiedzi" value={data.selectedDeckStats.correctAnswers} />
            <Stat label="Skuteczność" value={`${data.selectedDeckStats.accuracyPercent}%`} />
            <Stat label="Liczba odpowiedzi" value={data.selectedDeckStats.totalAnswers} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-semibold">Najtrudniejsze słówka</p>
              <div className="space-y-1">
                {data.selectedDeckStats.hardestWords.slice(0, 8).map((w) => <Row key={w.cardId} left={w.front} right={`${w.wrong} bł.`} />)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Najczęściej powtarzane słówka</p>
              <div className="space-y-1">
                {data.selectedDeckStats.mostRepeatedWords.slice(0, 8).map((w) => <Row key={w.cardId} left={w.front} right={`${w.repeats} razy`} />)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
      <span className="truncate">{left}</span>
      <span style={{ color: 'var(--text-muted)' }}>{right}</span>
    </div>
  )
}
