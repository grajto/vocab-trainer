'use client'

import { useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ContinueCard, type ContinueItem } from './ContinueCard'

export function JumpBackInCarousel({ items }: { items: ContinueItem[] }) {
  const railRef = useRef<HTMLDivElement | null>(null)
  const [active, setActive] = useState(0)
  const shownItems = useMemo(() => items.slice(0, 6), [items])

  function slide(direction: 'left' | 'right') {
    const el = railRef.current
    if (!el) return
    const delta = Math.round(el.clientWidth * 0.68)
    el.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' })
  }

  function onScroll() {
    const el = railRef.current
    if (!el) return
    const max = shownItems.length - 1
    if (max <= 0) return setActive(0)
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActive(Math.min(max, Math.max(0, Math.round(ratio * max))))
  }

  return (
    <div className="relative px-12">
      <button
        type="button"
        onClick={() => slide('left')}
        className="absolute left-0 top-1/2 z-20 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}
        aria-label="Przesuń w lewo"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => slide('right')}
        className="absolute right-0 top-1/2 z-20 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full"
        style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}
        aria-label="Przesuń w prawo"
      >
        <ChevronRight size={16} />
      </button>

      <div className="relative overflow-hidden">
        <div
          ref={railRef}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {shownItems.map((item) => (
            <div key={item.resumeHref} className="min-w-[80%] snap-start lg:min-w-[60%]">
              <ContinueCard item={item} />
            </div>
          ))}
        </div>

        {/* Fade gradient on right */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-20"
          style={{ background: 'linear-gradient(to left, var(--bg), rgba(255,255,255,0))' }}
        />
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {shownItems.map((item, idx) => (
          <span
            key={item.resumeHref}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: idx === active ? 'var(--primary)' : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}
