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
    <Link href={href} className="flex cursor-pointer items-center gap-[10px] rounded-[10px] px-[10px] py-2 transition-colors hover:bg-[#f8fafc]">
      <span
        className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[8px]"
        style={{ background: 'var(--primaryBg)', color: 'var(--primary)' }}
      >
        {type === 'deck' ? <BookOpen className="h-3 w-3" /> : <FolderOpen className="h-3 w-3" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[.875rem] font-semibold leading-5" style={{ color: 'var(--text)' }}>{title}</div>
        <div className="text-[.75rem]" style={{ color: 'var(--muted)' }}>{meta}</div>
      </div>
    </Link>
  )
}
