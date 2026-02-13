'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, Clock, AlertTriangle, BookOpen, Flame, MoreHorizontal, CheckCheck } from 'lucide-react'
import { PageHeader } from '../_components/PageHeader'
import { PageContainer } from '../_components/PageContainer'

interface Notification {
  id: string
  type: 'stale' | 'due' | 'goal' | 'hard'
  message: string
  deckId?: string
  read?: boolean
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      const data = await res.json()
      setNotifications(data.notifications || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function markRead(id: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ markAllRead: true }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const iconMap = { stale: Clock, due: AlertTriangle, goal: Flame, hard: BookOpen }
  const colorMap = {
    stale: { bg: 'var(--warning-soft)', color: 'var(--warning)' },
    due: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
    goal: { bg: 'var(--primary-soft)', color: 'var(--primary)' },
    hard: { bg: 'var(--success-soft)', color: 'var(--success)' },
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between gap-3">
        <PageHeader title="Powiadomienia" icon={Bell} />
        <button type="button" onClick={markAllRead} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold" style={{ border: '1px solid var(--border)', color: 'var(--text)' }}>
          <CheckCheck size={14} /> Oznacz wszystkie jako przeczytane
        </button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Ładowanie powiadomień…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-[var(--card-radius)] py-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Bell className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--border)' }} />
          <p className="text-sm" style={{ color: 'var(--text-soft)' }}>Brak nowych powiadomień.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = iconMap[n.type]
            const colors = colorMap[n.type]
            const ctaHref = n.deckId ? `/study?deck=${n.deckId}` : '/study'
            return (
              <div key={n.id} className="flex items-center gap-4 rounded-[var(--chip-radius)] px-4 py-3" style={{ border: '1px solid var(--border)', background: n.read ? 'var(--surface)' : 'var(--surface-muted)' }}>
                <div className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: colors.bg, color: colors.color }}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{n.message}</p>
                </div>
                <Link href={ctaHref} prefetch className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
                  Start
                </Link>
                {!n.read ? (
                  <button type="button" onClick={() => markRead(n.id)} className="rounded-md p-1 hover:bg-[var(--surface-muted)]" style={{ color: 'var(--text-soft)' }} aria-label="Oznacz jako przeczytane">
                    <CheckCheck size={16} />
                  </button>
                ) : (
                  <button type="button" className="rounded-md p-1" style={{ color: 'var(--text-soft)' }} aria-label="Przeczytane">
                    <MoreHorizontal size={16} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageContainer>
  )
}
