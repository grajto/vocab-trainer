'use client'

import { useState } from 'react'
import { BookOpen, Clock, MoreVertical, X } from 'lucide-react'
import { StartSessionButton } from './StartSessionButton'
import { Card } from '../../_components/ui/Card'

type RecommendedDeck = {
  id: string
  title: string
  reason: string
  progressPercent: number
  mode: string
  modeLabel: string
  targetCount: number
  estimatedMinutes: number
  direction: string
}

export function DismissableRecommendedCard({ item }: { item: RecommendedDeck }) {
  const [dismissed, setDismissed] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  function handleDismiss() {
    setDismissed(true)
    // Store dismissed items in localStorage
    try {
      const key = 'dismissed-recommendations'
      const stored = localStorage.getItem(key)
      const dismissedIds = stored ? JSON.parse(stored) : []
      const now = Date.now()
      // Store with timestamp, clean old ones (older than 24h)
      const filtered = dismissedIds.filter((item: any) => now - item.timestamp < 24 * 60 * 60 * 1000)
      filtered.push({ id: item.id, timestamp: now })
      localStorage.setItem(key, JSON.stringify(filtered))
    } catch (err) {
      console.error('Failed to store dismissed item:', err)
    }
    setShowMenu(false)
  }

  if (dismissed) return null

  return (
    <Card key={item.id} className="relative">
      <div className="space-y-4">
        {/* Header with deck name, mode badge, and menu button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <h3 className="text-base font-bold truncate flex-1" style={{ color: 'var(--text)' }}>{item.title}</h3>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              {item.modeLabel}
            </span>
          </div>
          
          {/* Three-dot menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-full hover:bg-[var(--hover-bg)] transition-colors"
              aria-label="Więcej opcji"
            >
              <MoreVertical size={16} style={{ color: 'var(--text-muted)' }} />
            </button>
            
            {showMenu && (
              <>
                {/* Backdrop to close menu */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowMenu(false)}
                />
                {/* Menu dropdown */}
                <div 
                  className="absolute right-0 top-full mt-1 z-20 rounded-lg shadow-lg border min-w-[180px]"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--hover-bg)] transition-colors rounded-lg"
                    style={{ color: 'var(--text)' }}
                  >
                    <X size={14} />
                    Usuń z ekranu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          <div className="flex items-center gap-1">
            <BookOpen size={14} />
            <span className="font-medium" style={{ color: 'var(--text)' }}>{item.targetCount}</span> kart
          </div>
          <div className="flex items-center gap-1">
            <Clock size={14} />
            <span className="font-medium" style={{ color: 'var(--text)' }}>{item.estimatedMinutes}</span> min
          </div>
        </div>

        {/* Start button */}
        <StartSessionButton
          deckId={item.id}
          mode={item.mode}
          targetCount={item.targetCount}
          direction={item.direction}
        />
      </div>
    </Card>
  )
}
