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
    const delta = Math.round(el.clientWidth * 0.72)
    el.scrollBy({ left: direction === 'right' ? delta : -delta, behavior: 'smooth' })
  }

  function onScroll() {
    const el = railRef.current
    if (!el) return
    const max = shownItems.length - 1
    if (max <= 0) {
      setActive(0)
      return
    }
    const ratio = el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)
    setActive(Math.min(max, Math.max(0, Math.round(ratio * max))))
  }

  return (
    <div className="relative">
      <div className="mb-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => slide('left')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Przesuń w lewo"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => slide('right')}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Przesuń w prawo"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div
        ref={railRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {shownItems.map((item) => (
          <div key={item.resumeHref} className="min-w-[82%] snap-start lg:min-w-[64%]">
            <ContinueCard item={item} />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-y-8 right-0 w-16 bg-gradient-to-l from-white to-transparent" />

      <div className="mt-1 flex items-center justify-center gap-1.5">
        {shownItems.map((item, idx) => (
          <span key={item.resumeHref} className={`h-1.5 w-1.5 rounded-full ${idx === active ? 'bg-[#4255ff]' : 'bg-slate-300'}`} />
        ))}
      </div>
    </div>
  )
}
