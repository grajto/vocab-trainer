import Link from 'next/link'
import { BookOpen, FolderOpen } from 'lucide-react'

type RecentItemProps = {
  href: string
  title: string
  meta: string
  type: 'deck' | 'folder'
  highlighted?: boolean
}

export function RecentItem({ href, title, meta, type }: RecentItemProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[var(--hover-bg)]"
    >
      <span
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
        style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}
      >
        {type === 'deck' ? <BookOpen size={16} /> : <FolderOpen size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-5 text-[var(--text)]">{title}</p>
        <p className="text-xs leading-4 text-[var(--text-muted)]">{meta}</p>
      </div>
    </Link>
  )
}
