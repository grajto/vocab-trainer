'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, Clock, AlertTriangle, BookOpen, Flame, MoreHorizontal } from 'lucide-react'

interface Notification {
  type: 'stale' | 'due' | 'goal' | 'hard'
  message: string
  deckId?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setNotifications(data.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  const iconMap = {
    stale: Clock,
    due: AlertTriangle,
    goal: Flame,
    hard: BookOpen,
  }

  const colorMap = {
    stale: { bg: '#fff7ed', color: '#f59e0b' },
    due: { bg: '#fef2f2', color: '#ef4444' },
    goal: { bg: 'var(--primaryBg)', color: 'var(--primary)' },
    hard: { bg: '#ecfdf5', color: '#10b981' },
  }

  return (
    <div className="mx-auto w-full space-y-6" style={{ maxWidth: 'var(--containerMax)' }}>
      <div className="flex items-center gap-3 pt-1">
        <span
          className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
        >
          <Bell size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
            Powiadomienia
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Przypomnienia i ważne informacje
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--gray400)' }}>Ładowanie powiadomień…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-[var(--radius)] py-12 text-center" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <Bell className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--border)' }} />
          <p className="text-sm" style={{ color: 'var(--gray400)' }}>Brak nowych powiadomień.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type]
            const colors = colorMap[n.type]
            const ctaHref = n.deckId ? `/study?deck=${n.deckId}` : '/study'
            return (
              <div key={i} className="flex items-center gap-4 rounded-[var(--radiusSm)] px-4 py-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]" style={{ background: colors.bg, color: colors.color }}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{n.message}</p>
                </div>
                <Link href={ctaHref} prefetch className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}>
                  Start
                </Link>
                <button type="button" className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--gray400)' }} aria-label="Więcej">
                  <MoreHorizontal size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
