'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'

export function FolderManageActions({ folderId, initialName }: { folderId: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  async function saveName() {
    await fetch(`/api/folders/${folderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name }),
    })
    setEditing(false)
    router.refresh()
  }

  async function removeFolder() {
    if (!confirm('Usunąć folder? Zestawy zostaną odpięte od folderu.')) return
    await fetch(`/api/folders/${folderId}`, { method: 'DELETE', credentials: 'include' })
    router.push('/folders')
    router.refresh()
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg border px-2 py-1 text-sm" style={{ borderColor: 'var(--border)' }} />
        <button type="button" onClick={saveName} className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: 'var(--primary)' }}>Zapisz</button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}><Pencil size={14} /> Zmień nazwę</button>
      <button type="button" onClick={removeFolder} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }}><Trash2 size={14} /> Usuń folder</button>
    </div>
  )
}
