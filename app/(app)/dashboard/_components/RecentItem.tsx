import Link from 'next/link'
import { BookOpen, FolderOpen } from 'lucide-react'

type RecentItemProps = {
  href: string
  title: string
  meta: string
  type: 'deck' | 'folder'
}

export function RecentItem({ href, title, meta, type }: RecentItemProps) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
        {type === 'deck' ? <BookOpen size={16} /> : <FolderOpen size={16} />}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-[15px] font-semibold text-slate-800">{title}</strong>
        <small className="text-xs text-slate-500">{meta}</small>
      </span>
    </Link>
  )
}
