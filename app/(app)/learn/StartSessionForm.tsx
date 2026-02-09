'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSound } from '@/src/lib/SoundProvider'

type Deck = { id: string; name: string }
type Folder = { id: string; name: string }

export function StartSessionForm({ decks, folders }: { decks: Deck[]; folders: Folder[] }) {
  const [resourceType, setResourceType] = useState<'deck' | 'folder'>('deck')
  const [deckId, setDeckId] = useState(decks[0]?.id || '')
  const [folderId, setFolderId] = useState(folders[0]?.id || '')
  const [mode, setMode] = useState('translate')
  const [targetCount, setTargetCount] = useState(10)
  const [direction, setDirection] = useState<'pl-en' | 'en-pl' | 'both'>('pl-en')
  const [levels, setLevels] = useState<number[]>([1, 2, 3, 4])
  const [shuffle, setShuffle] = useState(true)
  const [requireCorrect, setRequireCorrect] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { unlock } = useSound()

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings?.defaultDirection) {
          setDirection(data.settings.defaultDirection)
        }
      })
      .catch(() => null)
  }, [])

  function toggleLevel(level: number) {
    setLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    unlock()
    if (levels.length === 0) {
      setError('Wybierz przynajmniej jeden poziom.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deckId: resourceType === 'deck' ? deckId : undefined,
          folderId: resourceType === 'folder' ? folderId : undefined,
          mode,
          targetCount,
          direction,
          levels,
          shuffle,
          requireCorrect,
        }),
      })

      const data = await res.json()
      if (res.ok && data.sessionId) {
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode }))
        router.push(`/session/${data.sessionId}`)
      } else {
        setError(data.error || 'Failed to start session')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleStart} className="bg-white border border-slate-200 rounded-xl p-6 space-y-5 shadow-sm">
      {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Wybór zasobu</label>
          <select value={resourceType} onChange={e => setResourceType(e.target.value as 'deck' | 'folder')} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white">
            <option value="deck">Deck</option>
            <option value="folder">Folder</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">{resourceType === 'deck' ? 'Deck' : 'Folder'}</label>
          <select
            value={resourceType === 'deck' ? deckId : folderId}
            onChange={e => resourceType === 'deck' ? setDeckId(e.target.value) : setFolderId(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white"
          >
            {(resourceType === 'deck' ? decks : folders).map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Mode</label>
        <select value={mode} onChange={e => setMode(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white">
          <option value="translate">Wpisywanie</option>
          <option value="abcd">ABCD</option>
          <option value="sentence">Sentence</option>
          <option value="describe">Opisz słowo (AI)</option>
          <option value="mixed">Mixed</option>
          <option value="test">Test</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Kierunek</label>
        <select value={direction} onChange={e => setDirection(e.target.value as typeof direction)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white">
          <option value="pl-en">PL → EN</option>
          <option value="en-pl">EN → PL</option>
          <option value="both">Oba</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-2">Poziomy kart</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(level => (
            <label key={level} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={levels.includes(level)}
                onChange={() => toggleLevel(level)}
                className="accent-indigo-600"
              />
              Level {level}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">
          Cards: <span className="text-indigo-600 font-semibold">{targetCount}</span>
        </label>
        <input
          type="range"
          min={5}
          max={35}
          value={targetCount}
          onChange={e => setTargetCount(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
          <span>5</span>
          <span>35</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="accent-indigo-600" />
          Mieszaj kolejność
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={requireCorrect} onChange={e => setRequireCorrect(e.target.checked)} className="accent-indigo-600" />
          Wymagaj poprawnej odpowiedzi
        </label>
      </div>

      <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white py-3 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all">
        {loading ? 'Starting…' : 'Start Session'}
      </button>
    </form>
  )
}
