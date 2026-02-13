/* eslint-disable @typescript-eslint/no-explicit-any */
import { notFound, redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import { getUser } from '@/src/lib/getUser'
import { getPayload } from '@/src/lib/getPayload'
import { PageContainer } from '../../_components/PageContainer'
import { PageHeader } from '../../_components/PageHeader'

export default async function TestDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) redirect('/login')
  const { id } = await params
  const payload = await getPayload()

  let test: any
  try {
    test = await payload.findByID({ collection: 'tests', id, depth: 2 })
  } catch {
    notFound()
  }
  if (String(test.owner) !== String(user.id)) notFound()

  const answers = await payload.find({ collection: 'test_answers', where: { owner: { equals: user.id }, test: { equals: id } }, limit: 1000, depth: 1 })

  return (
    <PageContainer>
      <PageHeader title="Szczegóły testu" icon={ClipboardList} />
      <div className="rounded-xl border p-4 border-[var(--border)]">
        <p className="text-sm">Wynik: <b>{test.scorePercent}%</b> ({test.scoreCorrect}/{test.scoreTotal})</p>
      </div>
      <div className="space-y-2">
        {answers.docs.map((a: any) => (
          <div key={a.id} className="rounded-lg border px-3 py-2 border-[var(--border)]">
            <p className="text-sm font-semibold">{typeof a.card === 'object' ? a.card.front : 'Słówko'}</p>
            <p className="text-xs">Tryb: {a.modeUsed} | Odpowiedź: {a.userAnswer || '—'} | {a.isCorrect ? '✅' : '❌'}</p>
          </div>
        ))}
      </div>
    </PageContainer>
  )
}
