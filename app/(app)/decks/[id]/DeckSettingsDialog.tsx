'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'

type Deck = { id: string; name: string; description?: string; folder?: string | number | null; direction?: string | null }
type Folder = { id: string; name: string }

export function DeckSettingsDialog({ deck, deckId, folders }: { deck: Deck; deckId: string; folders?: Folder[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description || '')
  const [folderId, setFolderId] = useState<string>(deck.folder ? String(deck.folder) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim()) {
      setError('Nazwa jest wymagana')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deckId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          folderId: folderId || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Nie udało się zapisać')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors hover:opacity-90"
        style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
      >
        <Settings size={14} /> Ustawienia
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-[var(--surface)] p-5" style={{ border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text)]">Ustawienia zestawu</p>
              <button onClick={() => setOpen(false)} className="text-xs text-[var(--text-muted)]">
                Zamknij
              </button>
            </div>
            <label className="space-y-1 text-xs font-medium text-[var(--text-muted)]">
              Nazwa
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              />
            </label>
            <label className="space-y-1 text-xs font-medium text-[var(--text-muted)]">
              Opis
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              />
            </label>
            {folders && (
              <label className="space-y-1 text-xs font-medium text-[var(--text-muted)]">
                Folder
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <option value="">Bez folderu</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger-dark)' }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-full py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
              style={{ background: 'var(--primary)' }}
            >
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
