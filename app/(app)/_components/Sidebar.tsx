'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, FolderOpen, Plus, BookOpen, X, Menu, Calendar, Settings, Bell, Library } from 'lucide-react'
import { useState } from 'react'

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


  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-white/95 shadow-sm border border-slate-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full bg-white border-r border-slate-200 z-50
        w-72 flex flex-col
        transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <Link href="/dashboard" onClick={() => setOpen(false)} className="font-semibold text-lg text-slate-900 tracking-tight">Vocab Trainer</Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Główne</p>
            <div className="space-y-1">
              <Link href="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Home className="w-4 h-4" /> Strona główna
              </Link>
              <Link href="/library" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/library') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Library className="w-4 h-4" /> Twoje zasoby
              </Link>
              <Link href="/calendar" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/calendar') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Calendar className="w-4 h-4" /> Kalendarz
              </Link>
              <Link href="/settings" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/settings') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Settings className="w-4 h-4" /> Ustawienia
              </Link>
              <Link href="/notifications" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/notifications') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Bell className="w-4 h-4" /> Powiadomienia
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Foldery</p>
            <div className="space-y-1">
              {folders.slice(0, 6).map(folder => (
                <Link
                  key={folder.id}
                  href={`/folders/${folder.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === `/folders/${folder.id}` ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{folder.name}</span>
                </Link>
              ))}
              <Link href="/folders" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-indigo-700 hover:bg-indigo-50 transition-colors">
                <FolderOpen className="w-4 h-4" /> Zobacz wszystkie
              </Link>
            </div>
          </div>

          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Rozpocznij tutaj</p>
            <div className="space-y-1">
              <Link href="/study" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/study') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <BookOpen className="w-4 h-4" /> Ucz się
              </Link>
              <Link href="/create" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive('/create') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
                <Plus className="w-4 h-4" /> Kreator zestawów
              </Link>
              {decks.slice(0, 4).map(deck => (
                <Link
                  key={deck.id}
                  href={`/decks/${deck.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${pathname === `/decks/${deck.id}` ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span className="truncate">{deck.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}
