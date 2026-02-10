import Link from 'next/link'
import { Card } from './Card'

export function DeckCard({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <Link href={href}>
      <Card clickable compact>
        <p className="row__title">{title}</p>
        <p className="row__meta">{meta}</p>
      </Card>
    </Link>
  )
}
