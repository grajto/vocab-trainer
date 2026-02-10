'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, Folder, Home, LibraryBig, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Sidebar({ folders }: { folders: { id: string; name: string }[] }) {
  const pathname = usePathname() ?? ''
  const [open, setOpen] = useState(false)

  const item = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      <button aria-label="Open navigation" className="fixed left-4 top-4 z-40 rounded-pill bg-vt-surface p-3 shadow-vt-card lg:hidden" onClick={() => setOpen(true)}>
        <Menu className="h-5 w-5 text-vt-text" />
      </button>
      {open && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-vt-overlay lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`fixed left-0 top-0 z-40 h-full w-[280px] border-r border-vt-border bg-vt-surface p-4 transition lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div className="text-2xl font-semibold text-vt-text">Vocab Trainer</div>
          <button className="rounded-pill p-2 hover:bg-vt-soft lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5 text-vt-text" />
          </button>
        </div>

        <nav className="space-y-2">
          {[
            { href: '/dashboard', label: 'Home', icon: Home },
            { href: '/decks', label: 'Sets', icon: LibraryBig },
            { href: '/folders', label: 'Folders', icon: Folder },
            { href: '/study', label: 'Study', icon: BookOpen },
          ].map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex items-center gap-3 rounded-vt px-4 py-3 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vt-primary ${item(href) ? 'bg-vt-soft text-vt-primary' : 'text-vt-muted hover:bg-vt-soft hover:text-vt-text'}`}>
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-8 border-t border-vt-border pt-4">
          <p className="mb-3 text-sm font-semibold text-vt-muted">Your folders</p>
          <div className="space-y-2">
            {folders.map(folder => (
              <Link key={folder.id} href={`/folders/${folder.id}`} className="block truncate rounded-vt px-3 py-2 text-sm font-medium text-vt-muted hover:bg-vt-soft hover:text-vt-text">
                {folder.name}
              </Link>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}
