'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'
import { Card } from './Card'

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-vt-overlay p-4" onClick={onClose}>
      <Card className="w-full max-w-2xl rounded-vtlg p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-4xl font-semibold text-vt-text">{title}</h2>
          <Button variant="soft" className="p-3" onClick={onClose} aria-label="Close dialog">
            <X className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </Card>
    </div>
  )
}