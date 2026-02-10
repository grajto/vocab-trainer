'use client'

import { useId } from 'react'

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  const id = useId()
  return (
    <label htmlFor={id} className="flex items-center justify-between gap-4 py-2 text-vt-text font-medium">
      <span>{label}</span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-pill transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary ${checked ? 'bg-vt-primary' : 'bg-vt-border'}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}
