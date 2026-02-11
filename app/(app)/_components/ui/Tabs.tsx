'use client'

import { ReactNode } from 'react'

interface Tab {
  id: string
  label: string
  count?: number
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  children,
}: {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  children?: ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="flex items-center gap-6 border-b" style={{ borderColor: 'var(--border)' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="relative pb-3 text-sm font-semibold transition-colors -mb-px"
                style={{
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className="ml-1.5 text-xs"
                    style={{ color: isActive ? 'var(--primary)' : 'var(--text-soft)' }}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}
