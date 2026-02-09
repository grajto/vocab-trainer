'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [folderId, setFolderId] = useState('')
  const [direction, setDirection] = useState<'front-to-back' | 'back-to-front' | 'both'>('front-to-back')
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
    const tSep = termDel === 'tab' ? '\t' : termDel === 'comma' ? ',' : ';'
    const cSep = cardDel === 'newline' ? '\n' : ';'
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
          sessionStorage.setItem(`session-${sessionData.sessionId}`, JSON.stringify(sessionData.tasks))
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
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Create New Deck</h2>
        <div className="flex gap-2">
          <button
            onClick={() => saveDeck(true)}
            disabled={saving}
            className="bg-white border border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Create & Practice'}
          </button>
          <button
            onClick={() => saveDeck(false)}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2">{error}</p>}

      {/* Deck meta */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Deck Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. English B2 Vocabulary"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Folder (optional)</label>
            <select
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="">No folder</option>
              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Direction</label>
            <select
              value={direction}
              onChange={e => setDirection(e.target.value as typeof direction)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white"
            >
              <option value="front-to-back">Front → Back</option>
              <option value="back-to-front">Back → Front</option>
              <option value="both">Both (random)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Cards table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-900">
            Cards <span className="text-slate-400">({cards.filter(c => c.front && c.back).length} valid)</span>
          </p>
          <div className="flex gap-2">
            <button onClick={() => setShowImport(true)} className="text-xs text-slate-500 hover:text-indigo-600 font-medium border border-slate-200 px-3 py-1.5 rounded-lg hover:border-indigo-300 transition-colors">
              Import
            </button>
            <button onClick={addRow} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              + Add Row
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] sm:grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-0 px-5 py-2 bg-slate-50 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          <span>#</span>
          <span>Front (term)</span>
          <span>Back (definition)</span>
          <span className="hidden sm:block">Example</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-slate-100">
          {cards.map((card, idx) => (
            <div key={card.id} className="grid grid-cols-[2rem_1fr_1fr_2rem] sm:grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-0 px-5 py-2 items-center group hover:bg-slate-50/50">
              <span className="text-xs text-slate-300 tabular-nums">{idx + 1}</span>
              <input
                ref={idx === cards.length - 1 ? lastInputRef : undefined}
                type="text"
                value={card.front}
                onChange={e => updateCard(card.id, 'front', e.target.value)}
                onKeyDown={e => handleKeyDown(e, card.id, 'front')}
                placeholder="Term"
                className="text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-indigo-50 rounded"
              />
              <input
                type="text"
                value={card.back}
                onChange={e => updateCard(card.id, 'back', e.target.value)}
                onKeyDown={e => handleKeyDown(e, card.id, 'back')}
                placeholder="Definition"
                className="text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-indigo-50 rounded"
              />
              <input
                type="text"
                value={card.examples}
                onChange={e => updateCard(card.id, 'examples', e.target.value)}
                placeholder="Example sentence"
                className="hidden sm:block text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-indigo-50 rounded"
              />
              <button
                onClick={() => removeRow(card.id)}
                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <button onClick={addRow} className="w-full py-2 border border-dashed border-slate-200 rounded-lg text-sm text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors">
            + Add another card
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          Cancel
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => saveDeck(true)}
            disabled={saving}
            className="bg-white border border-indigo-200 text-indigo-600 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-50 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : 'Create & Practice'}
          </button>
          <button
            onClick={() => saveDeck(false)}
            disabled={saving}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving…' : `Create (${cards.filter(c => c.front && c.back).length} cards)`}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Import Cards</h3>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <textarea
                value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={`Paste your data here...\n\nExample (tab-separated):\nhello\tcześć\ndog\tpies\ncat\tkot`}
                rows={8}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none resize-none font-mono"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Between term and definition</label>
                  <select value={termDel} onChange={e => setTermDel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none">
                    <option value="tab">Tab</option>
                    <option value="comma">Comma</option>
                    <option value="semicolon">Semicolon</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">Between cards</label>
                  <select value={cardDel} onChange={e => setCardDel(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:border-indigo-500 focus:outline-none">
                    <option value="newline">New line</option>
                    <option value="semicolon">Semicolon</option>
                  </select>
                </div>
              </div>
              {importPreview.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-2">Preview ({importPreview.length} cards)</p>
                  <div className="max-h-40 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {importPreview.slice(0, 10).map((card, i) => (
                      <div key={i} className="px-3 py-2 text-sm flex gap-4">
                        <span className="text-slate-400 tabular-nums w-6">{i + 1}</span>
                        <span className="font-medium text-slate-900 flex-1">{card.front}</span>
                        <span className="text-slate-500 flex-1">{card.back}</span>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <p className="px-3 py-2 text-xs text-slate-400">…and {importPreview.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setShowImport(false)} className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importPreview.length === 0}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
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
