'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, Clock, AlertTriangle, BookOpen, Flame } from 'lucide-react'

interface Notification {
  type: 'stale' | 'due' | 'goal' | 'hard'
  message: string
  deckId?: string
  deckName?: string
  count?: number
  cardId?: string
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setNotifications(data.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  const iconMap = {
    stale: Clock,
    due: AlertTriangle,
    goal: Flame,
    hard: BookOpen,
  }

  const colorMap = {
    stale: 'text-amber-500 bg-amber-50',
    due: 'text-red-500 bg-red-50',
    goal: 'text-indigo-500 bg-indigo-50',
    hard: 'text-emerald-500 bg-emerald-50',
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-slate-400" />
        <h2 className="text-xl font-semibold text-slate-900">Powiadomienia</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Ładowanie powiadomień…</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Brak nowych powiadomień.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type]
            const color = colorMap[n.type]
            const ctaHref = n.deckId ? `/study?deck=${n.deckId}` : '/study'
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{n.message}</p>
                </div>
                <Link
                  href={ctaHref}
                  prefetch={true}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap"
                >
                  Start
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
