'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Bell, BookOpen, CalendarDays, FolderOpen, Home, Plus, Settings, X } from 'lucide-react'

interface FolderItem {
  id: string
  name: string
}

export function LeftSidebar({
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

  const groupTitle = 'px-2 text-[13px] font-semibold'
  const itemClass = (isActive: boolean) =>
    `flex min-h-[40px] items-center gap-[10px] rounded-[var(--radiusSm)] border px-[10px] py-2 text-sm transition-colors ${
      isActive
        ? 'border-[#d9e0ff] bg-[var(--primaryBg)] text-[var(--primary)] font-semibold'
        : 'border-transparent text-[var(--text)] hover:border-[var(--border)] hover:bg-[#f8fafc]'
    }`

  const nav = (
    <aside className="flex h-full flex-col overflow-y-auto border-r px-[10px] py-[10px]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="mb-1 flex items-center justify-between px-2 lg:hidden">
        <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Menu</span>
        <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-[#f8fafc]" style={{ color: 'var(--muted)' }} aria-label="Zamknij menu">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5">
        <section className="space-y-2">
          <p className={groupTitle}>Główne</p>
          <div className="space-y-1">
            <Link href="/dashboard" onClick={onClose} className={itemClass(active('/dashboard'))}><Home size={16} />Strona główna</Link>
            <Link href="/library" onClick={onClose} className={itemClass(active('/library'))}><FolderOpen size={16} />Twoje zasoby</Link>
            <Link href="/calendar" onClick={onClose} className={itemClass(active('/calendar'))}><CalendarDays size={16} />Kalendarz</Link>
            <Link href="/stats" onClick={onClose} className={itemClass(active('/stats'))}><BarChart3 size={16} />Statystyki</Link>
            <Link href="/settings" onClick={onClose} className={itemClass(active('/settings'))}><Settings size={16} />Ustawienia</Link>
            <Link href="/notifications" onClick={onClose} className={itemClass(active('/notifications'))}><Bell size={16} />Powiadomienia</Link>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className={groupTitle}>Twoje foldery</p>
          <div className="space-y-1">
            {folders.slice(0, 8).map((f) => (
              <Link key={f.id} href={`/folders/${f.id}`} onClick={onClose} className={itemClass(pathname === `/folders/${f.id}`)}>
                <FolderOpen size={15} />
                <span className="truncate">{f.name}</span>
              </Link>
            ))}
            <Link href="/folders" onClick={onClose} className={itemClass(active('/folders'))}><Plus size={16} />Nowy folder</Link>
          </div>
        </section>

        <section className="space-y-2 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <p className={groupTitle}>Rozpocznij tutaj</p>
          <div className="space-y-1">
            <Link href="/study" onClick={onClose} className={itemClass(active('/study'))}><BookOpen size={16} />Ucz się</Link>
            <Link href="/create" onClick={onClose} className={itemClass(active('/create'))}><Plus size={16} />Kreator zestawów</Link>
          </div>
        </section>
      </div>
    </aside>
  )

  if (!mobile) {
    return <div className="sticky top-0 h-screen">{nav}</div>
  }

  return (
    <>
      {open ? <div className="fixed inset-0 z-40 lg:hidden" style={{ background: 'rgba(15,23,42,0.3)' }} onClick={onClose} /> : null}
      <div className={`fixed inset-y-0 left-0 z-50 w-[260px] max-w-[88vw] transform transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: 'var(--surface)' }}>
        {nav}
      </div>
    </>
  )
}
