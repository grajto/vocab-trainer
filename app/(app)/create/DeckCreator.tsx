'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSound } from '@/src/lib/SoundProvider'
import { Card } from '../_components/ui/Card'
import { SectionHeading } from '../_components/ui/SectionHeading'
import { Modal } from '../_components/ui/Modal'
import { Settings, BookOpen, FileText, FolderOpen, Trash2, Plus, Upload, Check } from 'lucide-react'

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
  const direction = 'back-to-front'
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

  async function saveDeck() {
    const validCards = cards.filter(c => c.front.trim() && c.back.trim())
    if (!name.trim()) { setError('Deck name is required'); return }
    if (validCards.length === 0) { setError('Add at least 1 card with front and back'); return }

    setSaving(true)
    setError('')
    unlock()

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

      router.push(`/decks/${deckId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm rounded-xl px-4 py-2" style={{ color: 'var(--danger-dark)', background: 'var(--danger-soft)', border: '1px solid var(--danger-soft)' }}>{error}</p>}

      {/* Deck meta */}
      <Card>
        <SectionHeading title="Ustawienia zestawu" />
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
              <BookOpen size={14} />
              Nazwa zestawu *
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Słownictwo angielskie B2"
              className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
              style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                <FileText size={14} />
                Opis (opcjonalnie)
              </label>
              <input
                type="text"
                value={description}
                onChange={e => setOpis(e.target.value)}
                placeholder="Opcjonalny opis"
                className="w-full rounded-[var(--radiusSm)] px-3 py-2.5 text-sm focus:outline-none"
                style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--muted)' }}>
                <FolderOpen size={14} />
                Folder (opcjonalnie)
              </label>
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
          </div>
        </div>
      </Card>

      {/* Cards table */}
      <div className="rounded-[var(--radius)] overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
            Karty <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({cards.filter(c => c.front && c.back).length} prawidłowych)</span>
          </p>
          <button 
            onClick={() => setShowImport(true)} 
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-[var(--radiusSm)] transition-all hover:bg-[var(--hover-bg)]" 
            style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            <Upload size={14} />
            Importuj
          </button>
        </div>

        {/* Header */}
        <div className="hidden sm:grid sm:grid-cols-[3rem_1fr_1fr_1fr_3rem] gap-3 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--surface2)', color: 'var(--text-muted)' }}>
          <span>#</span>
          <span>Przód (termin)</span>
          <span>Tył (definicja)</span>
          <span>Przykład</span>
          <span></span>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {cards.map((card, idx) => (
            <div key={card.id} className="grid grid-cols-1 sm:grid-cols-[3rem_1fr_1fr_1fr_3rem] gap-2 sm:gap-3 px-5 py-3 sm:py-2.5 group transition-colors" style={{ background: 'transparent' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <div className="flex items-center gap-2 sm:block">
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>#{idx + 1}</span>
                <span className="sm:hidden text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Karta</span>
              </div>
              <div className="space-y-1">
                <label className="sm:hidden block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Przód (termin)</label>
                <input
                  ref={idx === cards.length - 1 ? lastInputRef : undefined}
                  type="text"
                  value={card.front}
                  onChange={e => updateCard(card.id, 'front', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, card.id, 'front')}
                  placeholder="Termin"
                  className="w-full text-sm border-0 bg-transparent px-2.5 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded-md transition-colors"
                  style={{ color: 'var(--text)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="sm:hidden block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tył (definicja)</label>
                <input
                  type="text"
                  value={card.back}
                  onChange={e => updateCard(card.id, 'back', e.target.value)}
                  onKeyDown={e => handleKeyDown(e, card.id, 'back')}
                  placeholder="Definicja"
                  className="w-full text-sm border-0 bg-transparent px-2.5 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded-md transition-colors"
                  style={{ color: 'var(--text)' }}
                />
              </div>
              <div className="space-y-1">
                <label className="sm:hidden block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Przykład</label>
                <input
                  type="text"
                  value={card.examples}
                  onChange={e => updateCard(card.id, 'examples', e.target.value)}
                  placeholder="Przykładowe zdanie"
                  className="w-full text-sm border-0 bg-transparent px-2.5 py-1.5 focus:outline-none focus:bg-[var(--primaryBg)] rounded-md transition-colors"
                  style={{ color: 'var(--text)' }}
                />
              </div>
              <div className="flex items-center justify-end sm:justify-center">
                <button
                  onClick={() => removeRow(card.id)}
                  className="opacity-60 sm:opacity-0 group-hover:opacity-100 p-2 rounded-md transition-all hover:bg-red-50"
                  style={{ color: 'var(--danger)' }}
                  title="Usuń kartę"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3.5" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={addRow} className="w-full py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-[var(--hover-bg)]" style={{ border: '1px dashed var(--border)', color: 'var(--text-muted)' }}>
            <span className="flex items-center justify-center gap-2">
              <Plus size={16} />
              Dodaj kolejną kartę
            </span>
          </button>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between gap-4 pt-2">
        <button 
          onClick={() => router.back()} 
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-[var(--hover-bg)]" 
          style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
        >
          Anuluj
        </button>
        <button
          onClick={() => saveDeck()}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
          style={{ background: 'var(--primary)', color: '#fff', border: '1px solid var(--primary)' }}
        >
          <Check size={16} />
          {saving ? 'Zapisywanie…' : `Utwórz (${cards.filter(c => c.front && c.back).length} kart)`}
        </button>
      </div>

      {/* Import Modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Importuj karty" size="lg">
        <div className="space-y-5">
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <Upload size={16} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>Wklej dane poniżej</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Każda linia to jedna karta. Oddziel termin od definicji wybranym separatorem.</p>
            </div>
          </div>

          <textarea
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder={`Wklej swoje dane tutaj...\n\nPrzykład (rozdzielone tabulatorem):\nhello\tcześć\ndog\tpies\ncat\tkot`}
            rows={10}
            className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none resize-none font-mono"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', background: 'var(--surface)' }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Separator między terminem a definicją</label>
              <select value={termDel} onChange={e => setTermDel(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="tab">Tabulator</option>
                <option value="comma">Przecinek</option>
                <option value="semicolon">Średnik</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Separator między kartami</label>
              <select value={cardDel} onChange={e => setCardDel(e.target.value)} className="w-full rounded-lg px-3 py-2.5 text-sm focus:outline-none" style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
                <option value="newline">Nowa linia</option>
                <option value="semicolon">Średnik</option>
              </select>
            </div>
          </div>

          {importPreview.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text)' }}>Podgląd ({importPreview.length} kart)</p>
              <div className="max-h-48 overflow-auto rounded-lg divide-y" style={{ border: '1px solid var(--border)' }}>
                {importPreview.slice(0, 10).map((card, i) => (
                  <div key={i} className="px-4 py-2.5 text-sm flex gap-4 items-center hover:bg-[var(--hover-bg)] transition-colors">
                    <span className="tabular-nums font-semibold w-8 text-center" style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>
                    <span className="font-medium flex-1" style={{ color: 'var(--text)' }}>{card.front}</span>
                    <span className="flex-1" style={{ color: 'var(--text-muted)' }}>{card.back}</span>
                  </div>
                ))}
                {importPreview.length > 10 && (
                  <p className="px-4 py-2.5 text-xs text-center" style={{ color: 'var(--text-muted)' }}>…oraz {importPreview.length - 10} więcej</p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={() => setShowImport(false)} 
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:bg-[var(--hover-bg)]" 
              style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              Anuluj
            </button>
            <button
              onClick={handleImport}
              disabled={importPreview.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold disabled:opacity-50 transition-all shadow-sm hover:shadow-md"
              style={{ background: 'var(--primary)', color: '#fff' }}
            >
              <Upload size={16} />
              Importuj {importPreview.length > 0 ? `${importPreview.length} kart` : ''}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
