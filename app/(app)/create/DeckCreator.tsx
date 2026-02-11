'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSound } from '@/src/lib/SoundProvider'

const CARD_CREATION_BATCH_SIZE = 5

interface CardRow {
  id: string
  front: string
  back: string
  examples: string
  notes: string
}

function newId() {
  return Math.random().toString(36).slice(2, 10)
}

export function DeckCreator({ folders }: { folders: Array<{ id: string; name: string }> }) {
  const router = useRouter()
  const { unlock } = useSound()
  const [name, setName] = useState('')
  const [description, setOpis] = useState('')
  const [folderId, setFolderId] = useState('')
  const [direction, setKierunek] = useState<'front-to-back' | 'back-to-front' | 'both'>('front-to-back')
  const [cards, setCards] = useState<CardRow[]>([
    { id: newId(), front: '', back: '', examples: '', notes: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Import modal
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [termDel, setTermDel] = useState('tab')
  const [cardDel, setCardDel] = useState('newline')

  const lastInputRef = useRef<HTMLInputElement>(null)
  const justAddedRef = useRef(false)

  useEffect(() => {
    if (justAddedRef.current && lastInputRef.current) {
      lastInputRef.current.focus()
      justAddedRef.current = false
    }
  }, [cards.length])

  const addRow = useCallback(() => {
    justAddedRef.current = true
    setCards(prev => [...prev, { id: newId(), front: '', back: '', examples: '', notes: '' }])
  }, [])

  const removeRow = useCallback((id: string) => {
    setCards(prev => prev.length > 1 ? prev.filter(c => c.id !== id) : prev)
  }, [])

  const updateCard = useCallback((id: string, field: keyof CardRow, value: string) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }, [])

  function handleKeyDown(e: React.KeyboardEvent, cardId: string, field: string) {
    if (e.key === 'Tab' && !e.shiftKey) {
      const card = cards.find(c => c.id === cardId)
      const isLast = cards[cards.length - 1]?.id === cardId
      if (isLast && field === 'back' && card?.front && card?.back) {
        e.preventDefault()
        addRow()
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Move to next field or next row
      const el = e.target as HTMLInputElement
      const nextEl = el.parentElement?.nextElementSibling?.querySelector('input') as HTMLInputElement | null
      if (nextEl) {
        nextEl.focus()
      } else {
        const card = cards.find(c => c.id === cardId)
        const isLast = cards[cards.length - 1]?.id === cardId
        if (isLast && card?.front && card?.back) {
          addRow()
        }
      }
    }
  }

  function parseImport(): CardRow[] {
    const termSepMap: Record<string, string> = { tab: '\t', comma: ',', semicolon: ';' }
    const cardSepMap: Record<string, string> = { newline: '\n', semicolon: ';' }
    const tSep = termSepMap[termDel] ?? '\t'
    const cSep = cardSepMap[cardDel] ?? '\n'
    return importText
      .split(cSep)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(tSep).map(p => p.trim())
        return {
          id: newId(),
          front: parts[0] || '',
          back: parts[1] || '',
          examples: parts[2] || '',
          notes: '',
        }
      })
      .filter(c => c.front && c.back)
  }

  function handleImport() {
    const parsed = parseImport()
    if (parsed.length === 0) return
    setCards(prev => {
      const existing = prev.filter(c => c.front || c.back)
      return [...existing, ...parsed]
    })
    setShowImport(false)
    setImportText('')
  }

  const importPreview = showImport ? parseImport() : []

  async function saveDeck(startSession: boolean) {
    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (!name.trim()) { setError('Deck name is required'); return }
    if (validCards.length === 0) { setError('Add at least 1 card with front and back'); return }

    setSaving(true)
    setError('')
    if (startSession) {
      unlock()
    }

    try {
      const deckRes = await fetch('/api/decks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          folderId: folderId || undefined,
          direction,
        }),
      })

      if (!deckRes.ok) {
        const data = await deckRes.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create deck')
      }

      const deckData = await deckRes.json()
      const deckId = deckData.id || deckData.deck?.id

      for (let i = 0; i < validCards.length; i += CARD_CREATION_BATCH_SIZE) {
        const batch = validCards.slice(i, i + CARD_CREATION_BATCH_SIZE)
        await Promise.all(batch.map(card =>
          fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              deckId: String(deckId),
              front: card.front.trim(),
              back: card.back.trim(),
              examples: card.examples.trim() || undefined,
              notes: card.notes.trim() || undefined,
              cardType: 'word',
            }),
          })
        ))
      }

      if (startSession) {
        // Start a session immediately
        const sessionRes = await fetch('/api/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            deckId: String(deckId),
            mode: 'translate',
            targetCount: Math.min(validCards.length, 20),
          }),
        })
        const sessionData = await sessionRes.json()
        if (sessionRes.ok && sessionData.sessionId) {
          sessionStorage.setItem(`session-${sessionData.sessionId}`, JSON.stringify({ tasks: sessionData.tasks, mode: 'translate', returnDeckId: String(deckId) }))
          router.push(`/session/${sessionData.sessionId}`)
          return
        }
      }

      router.push(`/decks/${deckId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => saveDeck(true)}
          disabled={saving}
          className="px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)', border: '1px solid transparent' }}
        >
          {saving ? 'Zapisywanie…' : 'Utwórz i ćwicz'}
        </button>
        <button
          onClick={() => saveDeck(false)}
          disabled={saving}
          className="px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
          style={{ background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }}
        >
          {saving ? 'Zapisywanie…' : 'Utwórz zestaw'}
        </button>
      </div>

      {error && <p className="text-sm rounded-xl px-4 py-2" style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</p>}

      {/* Deck meta */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Nazwa zestawu *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. English B2 Vocabulary"
            className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
            style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Folder (opcjonalnie)</label>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            >
              <option value="">Bez folderu</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Odpowiedz w języku</label>
            <select
              value={direction}
              onChange={e => setKierunek(e.target.value as typeof direction)}
              className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
            >
              <option value="front-to-back">🇵🇱 Polski</option>
              <option value="back-to-front">🇬🇧 Angielski</option>
              <option value="both">🌍 Oba (losowo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Opis</label>
            <input
              type="text"
              value={description}
              onChange={e => setOpis(e.target.value)}
              placeholder="Opcjonalny opis"
              className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>
      </div>

      {/* Cards table */}
      <div className="rounded-[var(--radius)] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
            Cards <span style={{ color: 'var(--gray400)' }}>({cards.filter(c => c.front && c.back).length} valid)</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="text-xs font-medium px-3 py-1.5 rounded-[var(--radiusSm)] transition-colors" style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
              Import
            </button>
            <button onClick={addRow} className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              + Add Row
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] sm:grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-0 px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ background: 'var(--surface2)', color: 'var(--gray400)' }}>
          <span>#</span>
          <span>Front (term)</span>
          <span>Back (definition)</span>
          <span className="hidden sm:block">Example</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {cards.map((card, idx) => (
            <div key={card.id} className="grid grid-cols-[2rem_1fr_1fr_2rem] sm:grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-0 px-5 py-2 items-center group hover:bg-[#f8fafc]">
              <span className="text-xs tabular-nums" style={{ color: 'var(--gray400)' }}>{idx + 1}</span>
              <input
                ref={idx === cards.length - 1 ? lastInputRef : undefined}
                type="text"
                value={card.front}
                onChange={e => updateCard(card.id, 'front', e.target.value)}
                onKeyDown={e => handleKeyDown(e, card.id, 'front')}
                placeholder="Term"
                className="text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded"
              />
              <input
                type="text"
                value={card.back}
                onChange={e => updateCard(card.id, 'back', e.target.value)}
                onKeyDown={e => handleKeyDown(e, card.id, 'back')}
                placeholder="Definition"
                className="text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded"
              />
              <input
                type="text"
                value={card.examples}
                onChange={e => updateCard(card.id, 'examples', e.target.value)}
                placeholder="Example sentence"
                className="hidden sm:block text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded"
              />
              <button
                onClick={() => removeRow(card.id)}
                className="opacity-0 group-hover:opacity-100 text-sm transition-colors hover:text-red-500"
                style={{ color: 'var(--gray400)' }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={addRow} className="w-full py-2 rounded-[var(--radiusSm)] text-sm transition-colors" style={{ border: '1px dashed var(--border)', color: 'var(--gray400)' }}>
            + Add another card
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm transition-colors" style={{ color: 'var(--gray400)' }}>
          Cancel
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => saveDeck(true)}
            disabled={saving}
            className="px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: 'var(--primaryBg)', color: 'var(--primary)', border: '1px solid transparent' }}
          >
            {saving ? 'Zapisywanie…' : 'Utwórz i ćwicz'}
          </button>
          <button
            onClick={() => saveDeck(false)}
            disabled={saving}
            className="px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{ background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }}
          >
            {saving ? 'Saving…' : `Create (${cards.filter(c => c.front && c.back).length} cards)`}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-[var(--radius)]" style={{ background: 'var(--surface)' }} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>Import Cards</h3>
              <button onClick={() => setShowImport(false)} className="text-xl" style={{ color: 'var(--gray400)' }}>×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={`Paste your data here...\n\nExample (tab-separated):\nhello\tcześć\ndog\tpies\ncat\tkot`}
                rows={8}
                className="w-full rounded-[var(--radiusSm)] px-4 py-3 text-sm focus:outline-none resize-none font-mono"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Between term and definition</label>
                  <select value={termDel} onChange={e => setTermDel(e.target.value)} className="w-full rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="tab">Tab</option>
                    <option value="comma">Comma</option>
                    <option value="semicolon">Semicolon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>Between cards</label>
                  <select value={cardDel} onChange={e => setCardDel(e.target.value)} className="w-full rounded-[var(--radiusSm)] px-3 py-2 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="newline">New line</option>
                    <option value="semicolon">Semicolon</option>
                  </select>
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>Preview ({importPreview.length} cards)</p>
                  <div className="max-h-40 overflow-auto rounded-[var(--radiusSm)] divide-y" style={{ border: '1px solid var(--border)' }}>
                    {importPreview.slice(0, 10).map((card, i) => (
                      <div key={i} className="px-3 py-2 text-sm flex gap-4">
                        <span className="tabular-nums w-6" style={{ color: 'var(--gray400)' }}>{i + 1}</span>
                        <span className="font-medium flex-1" style={{ color: 'var(--text)' }}>{card.front}</span>
                        <span className="flex-1" style={{ color: 'var(--muted)' }}>{card.back}</span>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <p className="px-3 py-2 text-xs" style={{ color: 'var(--gray400)' }}>…and {importPreview.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 flex justify-end gap-2" style={{ borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setShowImport(false)} className="text-sm px-4 py-2" style={{ color: 'var(--muted)' }}>
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importPreview.length === 0}
                className="px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50 transition-colors"
                style={{ background: 'var(--primary)', color: '#fff' }}
              >
                Import {importPreview.length} cards
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
