'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Settings } from 'lucide-react'

export function FolderSettingsDialog({ folderId, initialName }: { folderId: string; initialName: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
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
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
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

  async function handleDelete() {
    if (!confirm('Usunąć folder? Zestawy zostaną odpięte od folderu.')) return
    
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/folders/${folderId}`, { 
        method: 'DELETE', 
        credentials: 'include' 
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Nie udało się usunąć')
      }
      router.push('/folders')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd sieci')
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
              <p className="text-sm font-semibold text-[var(--text)]">Ustawienia folderu</p>
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
            {error && (
              <p className="rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger-dark)' }}>
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: 'var(--primary)' }}
              >
                {saving ? 'Zapisywanie…' : 'Zapisz'}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 rounded-full py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
                style={{ background: 'var(--danger)' }}
              >
                Usuń folder
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
