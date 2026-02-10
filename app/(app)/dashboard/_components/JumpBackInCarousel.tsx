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
    <div className="relative">
      <button
        type="button"
        onClick={() => slide('left')}
        className="absolute left-1 top-1/2 z-20 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        aria-label="Przesuń w lewo"
      >
        <ChevronLeft size={16} />
      </button>

      <button
        type="button"
        onClick={() => slide('right')}
        className="absolute right-1 top-1/2 z-20 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        aria-label="Przesuń w prawo"
      >
        <ChevronRight size={16} />
      </button>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-12 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shownItems.map((item) => (
          <div key={item.resumeHref} className="min-w-[80%] snap-start lg:min-w-[60%]">
            <ContinueCard item={item} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-12 w-24 bg-gradient-to-l from-white via-white/70 to-transparent" />

      <div className="mt-1 flex items-center justify-center gap-1.5">
        {shownItems.map((item, idx) => (
          <span key={item.resumeHref} className={`h-1.5 w-1.5 rounded-full ${idx === active ? 'bg-[#4255ff]' : 'bg-slate-300'}`} />
        ))}
      </div>
    </div>
  )
}
