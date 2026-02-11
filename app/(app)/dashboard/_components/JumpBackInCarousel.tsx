'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ContinueCard, type ContinueItem } from './ContinueCard'

export function JumpBackInCarousel({ items }: { items: ContinueItem[] }) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const shownItems = useMemo(() => items.slice(0, 6), [items])

  function slide(direction: 'left' | 'right') {
    const el = railRef.current
    if (!el) return
    const delta = Math.round(el.clientWidth * 0.85)
    el.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' })
  }

  function onScroll() {
    const el = railRef.current
    if (!el) return
    const max = shownItems.length - 1
    if (max <= 0) return setActive(0)
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActive(Math.min(max, Math.max(0, Math.round(ratio * max))))
    setScrollLeft(el.scrollLeft)
    
    // Show left arrow only when scrolled to the right
    setShowLeftArrow(el.scrollLeft > 10)
  }

  useEffect(() => {
    // Initialize scroll position on mount
    const el = railRef.current
    if (el) {
      setShowLeftArrow(el.scrollLeft > 10)
    }
  }, [])

  return (
    <div className="relative">
      {/* Left arrow - only show when scrolled */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => slide('left')}
          className="absolute left-4 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-opacity"
          style={{ border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.95)', color: 'var(--text)' }}
          aria-label="Przesuń w lewo"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Right arrow - always show */}
      <button
        type="button"
        onClick={() => slide('right')}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
        style={{ border: '1px solid var(--border)', background: 'rgba(255, 255, 255, 0.95)', color: 'var(--text)' }}
        aria-label="Przesuń w prawo"
      >
        <ChevronRight size={20} />
      </button>

      <div className="relative overflow-hidden">
        <div
          ref={railRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shownItems.map((item) => (
            <div key={item.resumeHref} className="min-w-full snap-start lg:min-w-[85%]">
              <ContinueCard item={item} />
            </div>
          ))}
        </div>

        {/* Fade gradient on right */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-24"
          style={{ background: 'linear-gradient(to left, var(--bg), rgba(255,255,255,0))' }}
        />
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {shownItems.map((item, idx) => (
          <span
            key={item.resumeHref}
            className="h-1.5 w-1.5 rounded-full transition-all"
            style={{ background: idx === active ? 'var(--primary)' : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}
