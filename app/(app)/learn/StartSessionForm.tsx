'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Database, Gamepad, Settings, Play } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'
import { Card } from '../_components/ui/Card'
import { SectionHeading } from '../_components/ui/SectionHeading'

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

  const selectedResourceName = useMemo(() => {
    if (resourceType === 'deck') {
      return decks.find(d => d.id === deckId)?.name || 'Deck'
    }
    return folders.find(f => f.id === folderId)?.name || 'Folder'
  }, [resourceType, deckId, folderId, decks, folders])

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.settings?.defaultDirection) setDirection(data.settings.defaultDirection)
        if (data.settings?.defaultStudyMode) setMode(data.settings.defaultStudyMode)
        if (typeof data.settings?.shuffleWords === 'boolean') setShuffle(Boolean(data.settings.shuffleWords))
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
        sessionStorage.setItem(`session-${data.sessionId}`, JSON.stringify({ tasks: data.tasks, mode, returnDeckId: resourceType === 'deck' ? deckId : '' }))
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

  const selectClass = "w-full h-10 rounded-lg px-3 text-sm focus:outline-none"
  const selectStyle = { border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }
  const labelClass = "block text-xs font-medium mb-1.5"

  const levelEmojis = ['🟢', '🟡', '🟠', '🔴']
  const levelLabels = ['Początek', 'Podstawowy', 'Średni', 'Zaawansowany']

  return (
    <form onSubmit={handleStart} className="space-y-4">
      {/* Step 1: Source */}
      <Card>
        <SectionHeading title="Źródło" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Typ zasobu</label>
            <select value={resourceType} onChange={e => setResourceType(e.target.value as 'deck' | 'folder')} className={selectClass} style={selectStyle}>
              <option value="deck">Deck</option>
              <option value="folder">Folder</option>
            </select>
          </div>
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>{resourceType === 'deck' ? 'Deck' : 'Folder'}</label>
            <select value={resourceType === 'deck' ? deckId : folderId} onChange={e => resourceType === 'deck' ? setDeckId(e.target.value) : setFolderId(e.target.value)} className={selectClass} style={selectStyle}>
              {(resourceType === 'deck' ? decks : folders).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Step 2: Mode */}
      <Card>
        <SectionHeading title="Tryb ćwiczeń" />
        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Tryb</label>
          <select value={mode} onChange={e => setMode(e.target.value)} className={selectClass} style={selectStyle}>
            <option value="translate">Wpisywanie</option>
            <option value="abcd">ABCD</option>
            <option value="sentence">Sentence</option>
            <option value="describe">Opisz słowo (AI)</option>
            <option value="mixed">Mixed</option>
            <option value="test">Test</option>
          </select>
        </div>
      </Card>

      {/* Step 3: Settings */}
      <Card>
        <SectionHeading title="Ustawienia" />

        <div className="space-y-4">
          <div>
            <label className={labelClass} style={{ color: 'var(--text-muted)' }}>Preferowany poziom słówek</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => toggleLevel(level)}
                  aria-label={`Poziom ${level}: ${levelLabels[level - 1]}${levels.includes(level) ? ' (wybrany)' : ''}`}
                  className="relative flex flex-col items-center justify-center gap-1.5 h-20 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    border: `2px solid ${levels.includes(level) ? 'var(--primary)' : 'var(--border)'}`,
                    background: levels.includes(level) ? 'var(--primary-soft)' : 'var(--surface)',
                    color: levels.includes(level) ? 'var(--primary)' : 'var(--text-muted)',
                    transform: levels.includes(level) ? 'scale(1.02)' : 'scale(1)',
                  }}
                >
                  <span className="text-2xl" aria-hidden="true">{levelEmojis[level - 1]}</span>
                  <span className="text-xs">{levelLabels[level - 1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelClass} style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Długość sesji</label>
              <span className="text-lg font-bold px-3 py-1 rounded-full" style={{ color: 'var(--primary)', background: 'var(--primary-soft)' }}>
                {targetCount} kart
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>5</span>
              <input 
                type="range" 
                min={5} 
                max={35} 
                value={targetCount} 
                onChange={e => setTargetCount(Number(e.target.value))} 
                className="flex-1 accent-[var(--primary)]"
                style={{ height: '6px' }}
              />
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>35</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="w-4 h-4 accent-[var(--primary)] cursor-pointer" />
              Mieszaj kolejność
            </label>
            <label className="flex items-center gap-2.5 text-sm cursor-pointer" style={{ color: 'var(--text)' }}>
              <input type="checkbox" checked={requireCorrect} onChange={e => setRequireCorrect(e.target.checked)} className="w-4 h-4 accent-[var(--primary)] cursor-pointer" />
              Wymagaj poprawnej odpowiedzi
            </label>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          {error}
        </div>
      )}

      {/* Start Button */}
      <button
        type="submit"
        disabled={loading}
        className="h-12 w-full sm:w-auto sm:px-8 rounded-full text-base font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:opacity-90"
        style={{ background: 'var(--primary)' }}
      >
        <Play className="w-5 h-5" />
        {loading ? 'Uruchamiam…' : 'Rozpocznij naukę'}
      </button>
    </form>
  )
}
