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

  const lastInputRef = useRef<HTMLInputElement>(null)
  const justAddedRef = useRef(false)

  // Focus last added row
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

  // Handle Tab on last back field to auto-add row
  function handleKeyDown(e: React.KeyboardEvent, cardId: string, field: string) {
    if (e.key === 'Tab' && !e.shiftKey) {
      const card = cards.find(c => c.id === cardId)
      const isLast = cards[cards.length - 1]?.id === cardId
      if (isLast && field === 'back' && card?.front && card?.back) {
        e.preventDefault()
        addRow()
      }
    }
  }

  async function handleSave() {
    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (!name.trim()) { setError('Deck name is required'); return }
    if (validCards.length === 0) { setError('Add at least 1 card with front and back'); return }

    setSaving(true)
    setError('')

    try {
      // Create deck
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

      // Create all cards in parallel (batch of CARD_CREATION_BATCH_SIZE at a time)
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

      router.push(`/decks/${deckId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Create New Deck</h2>

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
          <button onClick={addRow} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            + Add Row
          </button>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[2rem_1fr_1fr_2rem] sm:grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-0 px-5 py-2 bg-slate-50 text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          <span>#</span>
          <span>Front</span>
          <span>Back</span>
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
                placeholder="Front"
                className="text-sm border-0 bg-transparent px-2 py-1.5 focus:outline-none focus:bg-indigo-50 rounded"
              />
              <input
                type="text"
                value={card.back}
                onChange={e => updateCard(card.id, 'back', e.target.value)}
                onKeyDown={e => handleKeyDown(e, card.id, 'back')}
                placeholder="Back"
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

      {/* Save */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.back()} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50 transition-all"
        >
          {saving ? 'Saving…' : `Save Deck (${cards.filter(c => c.front && c.back).length} cards)`}
        </button>
      </div>
    </div>
  )
}
