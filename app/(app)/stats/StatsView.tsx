'use client'

import { useEffect, useMemo, useState } from 'react'

type StatsPayload = {
  filters: {
    decks: Array<{ id: string; name: string; folderId?: string }>
    folders: Array<{ id: string; name: string }>
  }
  global: {
    totalSessions: number
    totalMinutes: number
    levelDistribution: Record<string, number>
  }
  selectedDeckStats?: {
    deckId: string
    deckName: string
    levelDistribution: Record<string, number>
  } | null
  selectedFolderStats?: {
    folderId: string
    folderName: string
    levelDistribution: Record<string, number>
  } | null
}

export function StatsView() {
  const [data, setData] = useState<StatsPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [deckId, setDeckId] = useState('')
  const [folderId, setFolderId] = useState('')

  const query = useMemo(() => {
    const p = new URLSearchParams({ preset: 'all', deckId, folderId })
    return p.toString()
  }, [deckId, folderId])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetch(`/api/stats?${query}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => { if (!ignore) setData(json) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [query])

  if (!data) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{loading ? 'Ładowanie statystyk…' : 'Brak danych.'}</p>
  }

  const levelDistribution = deckId && data.selectedDeckStats?.levelDistribution
    ? data.selectedDeckStats.levelDistribution
    : folderId && data.selectedFolderStats?.levelDistribution
      ? data.selectedFolderStats.levelDistribution
      : data.global.levelDistribution

  const levelLabel = deckId && data.selectedDeckStats?.deckName
    ? data.selectedDeckStats.deckName
    : folderId && data.selectedFolderStats?.folderName
      ? data.selectedFolderStats.folderName
      : 'Wszystkie zestawy'

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-3 text-sm font-semibold">Zakres statystyk</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <select
            value={folderId}
            onChange={(e) => { setFolderId(e.target.value); setDeckId('') }}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Wszystkie foldery</option>
            {data.filters.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Wszystkie zestawy</option>
            {data.filters.decks.filter(d => !folderId || d.folderId === folderId).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Sesje</p>
          <p className="mt-2 text-2xl font-semibold">{data.global.totalSessions}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Czas</p>
          <p className="mt-2 text-2xl font-semibold">{data.global.totalMinutes} min</p>
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-3 text-sm font-semibold">Poziomy znajomości: {levelLabel}</p>
        <div className="space-y-2">
          {Object.entries(levelDistribution).map(([lvl, count]) => (
            <div key={lvl} className="flex items-center gap-3">
              <span className="w-16 text-xs font-semibold">Poziom {lvl}</span>
              <div className="h-2 flex-1 rounded-full" style={{ background: 'var(--surface-muted)' }}>
                <div
                  className="h-2 rounded-full"
                  style={{ width: `${Math.min(100, Number(count) * 4)}%`, background: 'var(--primary)' }}
                />
              </div>
              <span className="w-10 text-right text-xs">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
