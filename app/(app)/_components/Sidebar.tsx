'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Library, Bell, FolderOpen, Plus, BookOpen, GraduationCap, X, Menu, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface FolderItem {
  id: string
  name: string
}

export function Sidebar({ folders }: { folders: FolderItem[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close mobile sidebar on route change
  useEffect(() => { setOpen(false) }, [pathname])

  const navItems = [
    { href: '/', label: 'Strona główna', icon: Home },
    { href: '/library', label: 'Twoje zasoby', icon: Library },
    { href: '/stats', label: 'Statystyki', icon: BarChart3 },
    { href: '/notifications', label: 'Powiadomienia', icon: Bell },
  ]

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-slate-900/80 shadow-sm border border-slate-700"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-200" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-[#0f1237] border-r border-slate-800/70 z-50
        w-64 flex flex-col
        transition-transform duration-200
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/70">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-indigo-300" />
            <span className="font-semibold text-lg text-white tracking-tight">VocabTrainer</span>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded hover:bg-slate-800/60">
            <X className="w-5 h-5 text-slate-300" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-indigo-500/15 text-indigo-100'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          ))}

          {/* Folders section */}
          <div className="pt-4">
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Twoje foldery
            </p>
            {folders.map(folder => (
              <Link
                key={folder.id}
                href={`/folders/${folder.id}`}
                prefetch={true}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  pathname === `/folders/${folder.id}`
                    ? 'bg-indigo-500/15 text-indigo-100'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{folder.name}</span>
              </Link>
            ))}
            <Link
              href="/library?tab=folders&create=true"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-indigo-200 hover:bg-white/5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nowy folder
            </Link>
          </div>
        </nav>

        {/* Bottom quick links */}
        <div className="border-t border-slate-800/70 px-3 py-3 space-y-1">
          <Link
            href="/learn"
            prefetch={true}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Ucz się
          </Link>
        </div>
      </aside>
    </>
  )
}
