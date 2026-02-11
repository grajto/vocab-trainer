import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const payload = await getPayload()

  const test = await payload.findByID({ collection: 'tests', id, depth: 2 })
  if (String(test.owner) !== String(user.id)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const answers = await payload.find({ collection: 'test_answers', where: { owner: { equals: user.id }, test: { equals: id } }, limit: 1000, depth: 1 })

  return NextResponse.json({
    test,
    answers: answers.docs.map((a: any) => ({
      id: String(a.id),
      modeUsed: a.modeUsed,
      promptShown: a.promptShown,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      timeMs: a.timeMs,
      cardFront: typeof a.card === 'object' ? a.card.front : '',
      cardBack: typeof a.card === 'object' ? a.card.back : '',
    })),
  })
}
