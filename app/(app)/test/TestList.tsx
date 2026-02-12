'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'

type Item = { id: string; name: string }
type TestRow = {
  id: string
  status: string
  sourceType: 'set' | 'folder'
  sourceName: string
  startedAt: string
  finishedAt?: string | null
  questionCount: number
  scoreCorrect: number
  scoreTotal: number
  scorePercent: number
  durationMs: number
  enabledModes: string[]
}

type RankingRow = { key: string; deckName: string; avgScore: number; testsCount: number; lastTest: string }

export function TestList({ decks, folders }: { decks: Item[]; folders: Item[] }) {
  const router = useRouter()
  const search = useSearchParams()
  const [sourceType, setSourceType] = useState<'set' | 'folder' | 'all'>('set')
  const [deckId, setDeckId] = useState(decks[0]?.id || '')
  const [folderId, setFolderId] = useState(folders[0]?.id || '')
  const [questionCount, setQuestionCount] = useState(20)
  const [customCount, setCustomCount] = useState('')
  const [useAllWords, setUseAllWords] = useState(false)
  const [enabledModes, setEnabledModes] = useState<string[]>(['abcd', 'translate'])
  const [randomQuestionOrder, setRandomQuestionOrder] = useState(true)
  const [randomAnswerOrder, setRandomAnswerOrder] = useState(true)
  const [loadingStart, setLoadingStart] = useState(false)

  const [range, setRange] = useState('30')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [modeFilter, setModeFilter] = useState('all')
  const [tests, setTests] = useState<TestRow[]>([])
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [loadingResults, setLoadingResults] = useState(false)

  const sourceId = sourceType === 'all' ? 'all' : (sourceType === 'set' ? deckId : folderId)

  // Prefill from query params
  useEffect(() => {
    const qSource = search.get('source')
    const qDeck = search.get('deckId')
    const qFolder = search.get('folderId')
    if (qSource === 'folder' && qFolder) {
      setSourceType('folder')
      setFolderId(qFolder)
    } else if (qDeck) {
      setSourceType('set')
      setDeckId(qDeck)
    } else if (qSource === 'all') {
      setSourceType('all')
    }
  }, [search])

  async function loadResults() {
    setLoadingResults(true)
    try {
      const res = await fetch(`/api/tests?range=${range}&source=${sourceFilter}&mode=${modeFilter}`, { credentials: 'include' })
      const data = await res.json()
      setTests(data.tests || [])
      setRanking(data.ranking || [])
    } finally {
      setLoadingResults(false)
    }
  }

  useEffect(() => { void loadResults() }, [range, sourceFilter, modeFilter])

  const canStart = Boolean(sourceId) && enabledModes.length > 0

  async function startTest() {
    if (!canStart) return
    setLoadingStart(true)
    try {
      const count = useAllWords ? 9999 : (customCount ? Number(customCount) : questionCount)
      const create = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sourceType: useAllWords ? 'all' : sourceType,
          deckId: useAllWords ? null : (sourceType === 'set' ? deckId : null),
          folderId: useAllWords ? null : (sourceType === 'folder' ? folderId : null),
          questionCount: count,
          enabledModes,
          randomQuestionOrder,
          randomAnswerOrder,
          allowAll: useAllWords,
        }),
      })
      const created = await create.json()
      const testId = created.testId || undefined

      const start = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'test',
          deckId: useAllWords ? undefined : (sourceType === 'set' ? deckId : undefined),
          folderId: useAllWords ? undefined : (sourceType === 'folder' ? folderId : undefined),
          targetCount: count,
          enabledModes,
          shuffle: randomQuestionOrder,
          randomAnswerOrder,
          allowAll: useAllWords,
          testId,
        }),
      })
      const data = await start.json()
      if (!start.ok) throw new Error(data.error || 'Failed to start')
      sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode: 'test', testId, returnDeckId: sourceType === 'set' ? deckId : '' }))
      router.push(`/session/${data.sessionId}`)
    } finally {
      setLoadingStart(false)
    }
  }

  const countOptions = [10, 20, 30, 50]
  const modeLabels: Record<string, string> = { abcd: 'ABCD', translate: 'Tłumaczenie', sentence: 'Zdanie', describe: 'Opis' }

  const testsVisible = useMemo(() => tests.slice(0, 20), [tests])

  return (
    <div className="space-y-6">
      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="mb-4 text-sm font-semibold">Kreator testu</h3>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as 'set' | 'folder' | 'all')}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border)' }}
            disabled={useAllWords}
          >
            <option value="set">Zestaw</option><option value="folder">Folder</option><option value="all">Wszystkie źródła</option>
          </select>
          {sourceType === 'set' && !useAllWords ? (
            <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
              {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          ) : sourceType === 'folder' && !useAllWords ? (
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          ) : (
            <div className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              Wszystkie słowa z konta
            </div>
          )}
          <select value={String(questionCount)} onChange={(e) => { setQuestionCount(Number(e.target.value)); setCustomCount('') }} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
            {countOptions.map((c) => <option key={c} value={c}>{c} pytań</option>)}
            <option value="0">custom</option>
          </select>
          <input value={customCount} onChange={(e) => setCustomCount(e.target.value)} placeholder="custom" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }} disabled={useAllWords} />
          <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={useAllWords} onChange={(e) => setUseAllWords(e.target.checked)} />
            Wszystkie słowa (wszystkie zestawy i foldery)
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="mb-2 text-xs font-semibold">Tryby testu</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {['abcd', 'translate'].map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enabledModes.includes(m)}
                    onChange={(e) => setEnabledModes(prev => e.target.checked ? [...new Set([...prev, m])] : prev.filter(x => x !== m))}
                  />
                  <span>{modeLabels[m]}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--border)' }}>
            <p className="mb-2 text-xs font-semibold">Ustawienia kolejności</p>
            <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={randomQuestionOrder} onChange={(e) => setRandomQuestionOrder(e.target.checked)} /> Losowa kolejność pytań</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={randomAnswerOrder} onChange={(e) => setRandomAnswerOrder(e.target.checked)} /> Losowa kolejność odpowiedzi (ABCD)</label>
          </div>
        </div>

        <button type="button" onClick={startTest} disabled={!canStart || loadingStart} className="mt-4 rounded-full px-5 py-2 text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          {loadingStart ? 'Startuję…' : 'Rozpocznij test'}
        </button>
      </section>

      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-semibold">Wyniki</h3>
          <select value={range} onChange={(e) => setRange(e.target.value)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }}><option value="7">7 dni</option><option value="30">30 dni</option><option value="90">90 dni</option></select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }}><option value="all">Wszystkie źródła</option><option value="set">Zestawy</option><option value="folder">Foldery</option></select>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="rounded-lg border px-2 py-1 text-xs" style={{ borderColor: 'var(--border)' }}><option value="all">Wszystkie tryby</option><option value="abcd">ABCD</option><option value="translate">Tłumaczenie</option><option value="sentence">Zdanie</option><option value="describe">Opis</option></select>
        </div>
        {loadingResults ? <p className="text-sm">Ładowanie…</p> : (
          <div className="space-y-2">
            {testsVisible.map((t) => (
              <Link key={t.id} href={`/test/${t.id}`} className="grid grid-cols-6 items-center rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--border)' }}>
                <span>{new Date(t.startedAt).toLocaleString('pl-PL')}</span>
                <span>{t.sourceType === 'set' ? 'Zestaw' : 'Folder'}: {t.sourceName}</span>
                <span>{t.questionCount} pytań</span>
                <span>{t.scorePercent}% ({t.scoreCorrect}/{t.scoreTotal})</span>
                <span>{Math.round((t.durationMs || 0) / 1000)} s</span>
                <span>{t.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="mb-3 text-sm font-semibold">Ranking zestawów</h3>
        <div className="space-y-2">
          {ranking.map((r, idx) => (
            <div key={r.key} className="grid grid-cols-5 items-center rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
              <span>#{idx + 1}</span>
              <span>{r.deckName}</span>
              <span>{r.avgScore}%</span>
              <span>{r.testsCount}</span>
              <span>{new Date(r.lastTest).toLocaleDateString('pl-PL')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
