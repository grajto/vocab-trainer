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
          className="absolute left-2 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-opacity"
          style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text)' }}
          aria-label="Przesuń w lewo"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Right arrow - always show */}
      <button
        type="button"
        onClick={() => slide('right')}
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md"
        style={{ border: '1px solid var(--border)', background: '#fff', color: 'var(--text)' }}
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
            <div key={item.resumeHref} className="snap-start shrink-0 basis-full sm:basis-[48%] lg:basis-[38%]">
              <ContinueCard item={item} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5">
        {shownItems.map((item, idx) => (
          <span
            key={item.resumeHref}
            className="h-2 w-2 rounded-full transition-all"
            style={{ background: idx === active ? 'var(--primary)' : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}
