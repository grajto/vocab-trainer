'use client'

import { useState } from 'react'
import Link from 'next/link'

const navItems = [
  { href: '/', label: 'Strona główna' },
  { href: '/library', label: 'Twoje zasoby' },
  { href: '/stats', label: 'Powiadomienia' },
]

export function AppShell({
  children,
  userLabel,
  activePath,
}: {
  children: React.ReactNode
  userLabel?: string
  activePath?: string
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 border-r border-neutral-200 bg-white px-4 py-6">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">Q</div>
          <span className="font-semibold tracking-tight">Vocab Trainer</span>
        </div>
        <nav className="space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                activePath === item.href ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <p className="text-[11px] text-neutral-400 uppercase tracking-widest px-3 mb-2">Twoje foldery</p>
          <div className="space-y-1">
            <button className="w-full text-left px-3 py-2 rounded-xl text-sm text-neutral-500 hover:bg-neutral-100">Brak folderów</button>
            <button className="w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-blue-600 hover:bg-blue-50">+ Nowy folder</button>
          </div>
        </div>
        <div className="mt-auto px-3 text-xs text-neutral-400">{userLabel}</div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
            <button
              className="lg:hidden h-9 w-9 rounded-full border border-neutral-200 flex items-center justify-center"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <div className="flex-1">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Szukaj zestawów"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <button className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg">+</button>
            <div className="h-10 w-10 rounded-full bg-neutral-200" />
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
          {children}
        </main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-64 bg-white p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="font-semibold">Menu</span>
              <button onClick={() => setDrawerOpen(false)}>✕</button>
            </div>
            <nav className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`block px-3 py-2 rounded-xl text-sm font-medium ${
                    activePath === item.href ? 'bg-blue-50 text-blue-700' : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  )
}
