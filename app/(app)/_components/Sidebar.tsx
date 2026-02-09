'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FolderOpen, Plus, BookOpen, GraduationCap, X, Menu } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FolderItem {
  id: string
  name: string
}

interface DeckItem {
  id: string
  name: string
}

export function Sidebar({ folders, decks }: { folders: FolderItem[]; decks: DeckItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white/95 shadow-sm border border-slate-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50
        w-64 flex flex-col
        transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-600" />
            <span className="font-semibold text-lg text-slate-900 tracking-tight">VocabTrainer</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Główne</p>
            <Link
              href="/"
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              Dashboard
            </Link>
            <Link
              href="/learn"
              prefetch={true}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              Szybki start
            </Link>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Foldery i decki
            </p>
            {folders.map(folder => (
              <Link
                key={folder.id}
                href={`/folders/${folder.id}`}
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === `/folders/${folder.id}`
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{folder.name}</span>
              </Link>
            ))}
            <Link
              href="/library?tab=folders&create=true"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nowy folder
            </Link>
            {decks.map(deck => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === `/decks/${deck.id}`
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{deck.name}</span>
              </Link>
            ))}
            <Link
              href="/library"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            >
              Zobacz wszystkie
            </Link>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Ucz się</p>
            <Link
              href="/learn"
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/learn')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-5 h-5 flex-shrink-0" />
              Panel Ucz się
            </Link>
          </div>
        </nav>

        <div className="border-t border-slate-200 px-3 py-3 text-xs text-slate-400">
          Quizlet-style navigation
        </div>
      </aside>
    </>
  )
}
