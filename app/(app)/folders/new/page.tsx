'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderPlus } from 'lucide-react'
import { PageContainer } from '../../_components/PageContainer'
import { PageHeader } from '../../_components/PageHeader'

export default function NewFolderPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, description }),
      })
      if (!res.ok) throw new Error('create')
      router.push('/folders')
      router.refresh()
    } catch {
      setError('Nie udało się utworzyć folderu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageContainer maxWidth="720px">
      <PageHeader title="Nowy folder" icon={FolderPlus} />
      <form onSubmit={submit} className="rounded-xl border p-5 space-y-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div>
          <label className="mb-1 block text-sm font-medium">Nazwa folderu</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg border px-3 py-2 text-sm border-[var(--border)]" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Opis (opcjonalnie)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-lg border px-3 py-2 text-sm border-[var(--border)]" />
        </div>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <button type="submit" disabled={loading} className="rounded-full px-4 py-2 text-sm font-semibold text-white" style={{ background: 'var(--primary)' }}>
          {loading ? 'Tworzenie…' : 'Utwórz folder'}
        </button>
      </form>
    </PageContainer>
  )
}
