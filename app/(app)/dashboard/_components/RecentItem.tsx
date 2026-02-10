import Link from 'next/link'
import { BookOpen, FolderOpen } from 'lucide-react'

type RecentItemProps = {
  href: string
  title: string
  meta: string
  type: 'deck' | 'folder'
  highlighted?: boolean
}

export function RecentItem({ href, title, meta, type, highlighted }: RecentItemProps) {
  return (
    <Link href={href} className={`flex items-center gap-3 rounded-xl px-2 py-2 transition ${highlighted ? 'bg-slate-100' : 'hover:bg-slate-50'}`}>
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8f4ff] text-[#2b74c9]">
        {type === 'deck' ? <BookOpen size={16} /> : <FolderOpen size={16} />}
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-lg font-medium leading-tight text-slate-900">{title}</strong>
        <small className="text-sm font-semibold text-slate-500">{meta}</small>
      </span>
    </Link>
  )
}
