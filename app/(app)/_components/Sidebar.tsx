'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, FolderOpen, Home, PlusCircle } from 'lucide-react'

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
  const active = (href: string) => pathname.startsWith(href)

  const nav = (
    <aside className="sidebar">
      <div className="sidebar__group">
        <p className="sidebar__title">Navigation</p>
        <Link href="/dashboard" onClick={onClose} className={`sidebar__link ${active('/dashboard') ? 'is-active' : ''}`}><Home size={16} /> Home</Link>
        <Link href="/library" onClick={onClose} className={`sidebar__link ${active('/library') ? 'is-active' : ''}`}><FolderOpen size={16} /> Your resources</Link>
        <Link href="/study" onClick={onClose} className={`sidebar__link ${active('/study') ? 'is-active' : ''}`}><BookOpen size={16} /> Study</Link>
      </div>

      <div className="sidebar__group">
        <p className="sidebar__title">Quick actions</p>
        <Link href="/library?tab=folders&create=true" onClick={onClose} className="sidebar__link"><PlusCircle size={16} /> Create folder</Link>
        <Link href="/create" onClick={onClose} className="sidebar__link"><PlusCircle size={16} /> Create set</Link>
      </div>

      <div className="sidebar__group">
        <p className="sidebar__title">Folders</p>
        {folders.slice(0, 8).map(f => (
          <Link key={f.id} href={`/folders/${f.id}`} onClick={onClose} className={`sidebar__link ${pathname === `/folders/${f.id}` ? 'is-active' : ''}`}>
            <FolderOpen size={14} /> {f.name}
          </Link>
        ))}
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
