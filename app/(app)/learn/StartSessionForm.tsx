'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star } from 'lucide-react'
import { useSound } from '@/src/lib/SoundProvider'

type Deck = { id: string; name: string }
type Folder = { id: string; name: string }

type FavoritePreset = {
  id: string
  label: string
  resourceType: 'deck' | 'folder'
  deckId: string
  folderId: string
  mode: string
  targetCount: number
  direction: 'pl-en' | 'en-pl' | 'both'
}

const FAVORITES_KEY = 'study-favorites-v1'

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
  const [favorites, setFavorites] = useState<FavoritePreset[]>([])
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
      })
      .catch(() => null)

    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (raw) setFavorites(JSON.parse(raw))
    } catch {
      setFavorites([])
    }
  }, [])

  function toggleLevel(level: number) {
    setLevels(prev => prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level])
  }

  function saveFavorite() {
    const preset: FavoritePreset = {
      id: crypto.randomUUID(),
      label: `${selectedResourceName} · ${mode} · ${targetCount}`,
      resourceType,
      deckId,
      folderId,
      mode,
      targetCount,
      direction,
    }
    const next = [preset, ...favorites].slice(0, 6)
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  function loadFavorite(favorite: FavoritePreset) {
    setResourceType(favorite.resourceType)
    setDeckId(favorite.deckId)
    setFolderId(favorite.folderId)
    setMode(favorite.mode)
    setTargetCount(favorite.targetCount)
    setDirection(favorite.direction)
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
    <div className="space-y-4">
      <form onSubmit={handleStart} className="rounded-[var(--radius)] p-6 space-y-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Panel nauki</h3>
          <button type="button" onClick={saveFavorite} className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] border border-[var(--primary)] rounded-full px-3 py-1.5 hover:bg-[var(--primaryBg)]">
            <Star className="w-3.5 h-3.5" /> Dodaj do ulubionych
          </button>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Wybór zasobu</label>
            <select value={resourceType} onChange={e => setResourceType(e.target.value as 'deck' | 'folder')} className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none bg-[var(--surface)]">
              <option value="deck">Deck</option>
              <option value="folder">Folder</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>{resourceType === 'deck' ? 'Deck' : 'Folder'}</label>
            <select value={resourceType === 'deck' ? deckId : folderId} onChange={e => resourceType === 'deck' ? setDeckId(e.target.value) : setFolderId(e.target.value)} className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none bg-[var(--surface)]">
              {(resourceType === 'deck' ? decks : folders).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Tryb ćwiczeń</label>
            <select value={mode} onChange={e => setMode(e.target.value)} className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none bg-[var(--surface)]">
              <option value="translate">Wpisywanie</option>
              <option value="abcd">ABCD</option>
              <option value="sentence">Sentence</option>
              <option value="describe">Opisz słowo (AI)</option>
              <option value="mixed">Mixed</option>
              <option value="test">Test</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Kierunek</label>
            <select value={direction} onChange={e => setDirection(e.target.value as typeof direction)} className="w-full border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:border-[var(--primary)] focus:outline-none bg-[var(--surface)]">
              <option value="pl-en">PL → EN</option>
              <option value="en-pl">EN → PL</option>
              <option value="both">Oba</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Preferowany level słówek</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(level => (
              <button key={level} type="button" onClick={() => toggleLevel(level)} className={`text-sm border rounded-[var(--radiusSm)] px-3 py-2 ${levels.includes(level) ? 'bg-[var(--primaryBg)] border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted)]'}`}>
                Level {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Długość sesji: <span className="font-semibold" style={{ color: 'var(--primary)' }}>{targetCount} kart</span></label>
          <input type="range" min={5} max={35} value={targetCount} onChange={e => setTargetCount(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" style={{ color: 'var(--muted)' }}>
          <label className="flex items-center gap-2"><input type="checkbox" checked={shuffle} onChange={e => setShuffle(e.target.checked)} className="accent-[var(--primary)]" />Mieszaj kolejność</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={requireCorrect} onChange={e => setRequireCorrect(e.target.checked)} className="accent-[var(--primary)]" />Wymagaj poprawnej odpowiedzi</label>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[var(--primary)] text-white py-3 rounded-[var(--radius)] text-sm font-medium hover:brightness-90 disabled:opacity-50 transition-all">
          {loading ? 'Uruchamiam…' : 'Zacznij sesję'}
        </button>
      </form>

      <section className="rounded-[var(--radius)] p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Ulubione ustawienia sesji</h4>
        {favorites.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nie masz jeszcze ulubionych presetów.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {favorites.map(fav => (
              <button key={fav.id} type="button" onClick={() => loadFavorite(fav)} className="text-left border border-[var(--border)] rounded-[var(--radiusSm)] px-3 py-2 hover:border-[var(--primary)]">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{fav.label}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{fav.resourceType === 'deck' ? 'Deck' : 'Folder'} · {fav.direction}</p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
