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
    <Link href={href} className={`flex cursor-pointer items-start gap-2 rounded-md py-2 transition ${highlighted ? 'bg-slate-100 px-2' : 'hover:bg-slate-50 px-1'}`}>
      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#e8f4ff]">
        {type === 'deck' ? <BookOpen className="h-4 w-4 text-indigo-500" /> : <FolderOpen className="h-4 w-4 text-indigo-500" />}
      </span>

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-5 text-slate-800">{title}</div>
        <div className="mt-0.5 inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{meta}</div>
      </div>
    </Link>
  )
}
