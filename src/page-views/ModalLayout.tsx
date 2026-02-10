'use client'

import { Button } from '@/src/components/Button'
import { Modal } from '@/src/components/Modal'
import { Toggle } from '@/src/components/Toggle'
import { useState } from 'react'

export function TestConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [multipleChoice, setMultipleChoice] = useState(true)
  const [written, setWritten] = useState(true)

  return (
    <Modal open={open} onClose={onClose} title="Configure test">
      <div className="space-y-4">
        <Toggle checked={multipleChoice} onChange={setMultipleChoice} label="Multiple choice" />
        <Toggle checked={written} onChange={setWritten} label="Written response" />
      </div>
      <div className="mt-6 flex justify-end">
        <Button>Start new test</Button>
      </div>
    </Modal>
  )
}
