'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BookOpen, CalendarDays, FolderOpen, Home, Plus, Settings } from 'lucide-react'

interface FolderItem { id: string; name: string }

export function Sidebar({
  folders,
  mobile,
  open,
  onClose,
}: {
  folders: FolderItem[]
  mobile?: boolean
  open?: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  const nav = (
    <aside className="sidebar">
      <div className="sidebar__group">
        <p className="sidebar__title">Główne</p>
        <Link href="/dashboard" onClick={onClose} className={`sidebar__link ${active('/dashboard') ? 'is-active' : ''}`}><Home size={16} /> Strona główna</Link>
        <Link href="/library" onClick={onClose} className={`sidebar__link ${active('/library') ? 'is-active' : ''}`}><FolderOpen size={16} /> Twoje zasoby</Link>
        <Link href="/calendar" onClick={onClose} className={`sidebar__link ${active('/calendar') ? 'is-active' : ''}`}><CalendarDays size={16} /> Kalendarz</Link>
        <Link href="/settings" onClick={onClose} className={`sidebar__link ${active('/settings') ? 'is-active' : ''}`}><Settings size={16} /> Ustawienia</Link>
        <Link href="/notifications" onClick={onClose} className={`sidebar__link ${active('/notifications') ? 'is-active' : ''}`}><Bell size={16} /> Powiadomienia</Link>
      </div>

      <div className="sidebar__group">
        <p className="sidebar__title">Twoje foldery</p>
        {folders.slice(0, 8).map(f => (
          <Link key={f.id} href={`/folders/${f.id}`} onClick={onClose} className={`sidebar__link ${pathname === `/folders/${f.id}` ? 'is-active' : ''}`}>
            <FolderOpen size={14} /> {f.name}
          </Link>
        ))}
        <Link href="/folders" onClick={onClose} className={`sidebar__link ${active('/folders') ? 'is-active' : ''}`}><Plus size={16} /> Nowy folder</Link>
      </div>

      <div className="sidebar__group">
        <p className="sidebar__title">Rozpocznij tutaj</p>
        <Link href="/study" onClick={onClose} className={`sidebar__link ${active('/study') ? 'is-active' : ''}`}><BookOpen size={16} /> Ucz się</Link>
        <Link href="/create" onClick={onClose} className={`sidebar__link ${active('/create') ? 'is-active' : ''}`}><Plus size={16} /> Kreator zestawów</Link>
      </div>
    </aside>
  )

  if (!mobile) return nav

  return (
    <>
      {open ? <div className="sidebar-drawer-overlay" onClick={onClose} /> : null}
      <div className={`sidebar-drawer ${open ? 'is-open' : ''}`}>
        {nav}
      </div>
    </>
  )
}
