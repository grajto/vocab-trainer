'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, Clock, AlertTriangle, BookOpen, Flame } from 'lucide-react'

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
    stale: 'text-amber-500 bg-amber-50',
    due: 'text-red-500 bg-red-50',
    goal: 'text-[#4255ff] bg-[#eef1ff]',
    hard: 'text-emerald-500 bg-emerald-50',
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-slate-500" />
        <h2 className="text-2xl font-semibold text-slate-900">Powiadomienia</h2>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Ładowanie powiadomień…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">Brak nowych powiadomień.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const Icon = iconMap[n.type]
            const color = colorMap[n.type]
            const ctaHref = n.deckId ? `/study?deck=${n.deckId}` : '/study'
            return (
              <div key={i} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className={`rounded-lg p-2 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{n.message}</p>
                </div>
                <Link href={ctaHref} prefetch className="whitespace-nowrap rounded-lg bg-[#eef1ff] px-3 py-1.5 text-xs font-semibold text-[#4255ff] hover:bg-[#e4e9ff]">
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
