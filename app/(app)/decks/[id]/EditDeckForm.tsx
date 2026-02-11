'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  deck: { id: string; name: string; description?: string; folder?: string | number | null; direction?: string | null }
  folders: Array<{ id: string; name: string }>
}

export function EditDeckForm({ deck, folders }: Props) {
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description || '')
  const [folderId, setFolderId] = useState<string>(deck.folder ? String(deck.folder) : '')
  const [direction, setDirection] = useState(deck.direction || 'front-to-back')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Nazwa jest wymagana')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          folderId: folderId || null,
          direction,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Nie udało się zapisać')
      }
      router.push(`/decks/${deck.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd sieci')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm focus:border-[var(--primary)] focus:outline-none'
  const labelClass = 'text-xs font-medium mb-1 block'

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
      <div>
        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
          Nazwa zestawu
        </label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
      </div>
      <div>
        <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
          Opis
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            Folder
          </label>
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={inputClass}>
            <option value="">Bez folderu</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={{ color: 'var(--text-muted)' }}>
            Kierunek
          </label>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputClass}>
            <option value="front-to-back">Front → Back</option>
            <option value="back-to-front">Back → Front</option>
            <option value="both">Oba</option>
          </select>
        </div>
      </div>
      {error && (
        <p className="rounded-lg px-3 py-2 text-sm" style={{ background: '#fef2f2', color: '#b91c1c' }}>
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(`/decks/${deck.id}`)}
          className="h-10 rounded-full px-4 text-sm font-semibold transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          Anuluj
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-full px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ background: 'var(--primary)' }}
        >
          {saving ? 'Zapisywanie…' : 'Zapisz zmiany'}
        </button>
      </div>
    </form>
  )
}
