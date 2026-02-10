'use client'

import Link from 'next/link'
import { Menu, Plus, Search, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from './ui/Input'
import { Button } from './ui/Button'

export function TopNav({ username, onOpenSidebar }: { username: string; onOpenSidebar: () => void }) {
  const [q, setQ] = useState('')
  const router = useRouter()

  return (
    <header className="top-nav">
      <div className="top-nav__inner">
        <button className="btn btn--ghost show-mobile" onClick={onOpenSidebar} aria-label="Open menu">
          <Menu size={16} />
        </button>

        <Link href="/dashboard" className="row__title" style={{ whiteSpace: 'nowrap' }}>
          Vocab Trainer
        </Link>

        <form
          className="hidden-mobile"
          style={{ flex: 1, display: 'flex', maxWidth: 520 }}
          onSubmit={e => {
            e.preventDefault()
            if (q.trim()) router.push(`/library?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search sets and folders" />
        </form>

        <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
          <Link href="/create"><Button variant="primary"><Plus size={14} /> New set</Button></Link>
          <Link href="/settings"><Button variant="ghost"><Settings size={14} /></Button></Link>
          <span className="btn btn--secondary" style={{ pointerEvents: 'none' }}><Search size={14} /> {username}</span>
        </div>
      </div>
    </header>
  )
}
