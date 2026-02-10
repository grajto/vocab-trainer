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
      {type === 'deck' ? <BookOpen className="mt-0.5 h-4 w-4 text-indigo-500" /> : <FolderOpen className="mt-0.5 h-4 w-4 text-indigo-500" />}

      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-5 text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{meta}</div>
      </div>
    </Link>
  )
}
