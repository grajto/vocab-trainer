import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await getPayload()
  const existing = await payload.find({
    collection: 'user_test_preferences',
    where: { user: { equals: user.id } },
    limit: 1,
  })

  return NextResponse.json(existing.docs[0] || null)
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const payload = await getPayload()

  const body = await req.json()
  const data = {
    user: user.id,
    questionCount: Math.min(Math.max(Number(body.questionCount) || 10, 5), 50),
    starredOnly: !!body.starredOnly,
    enabledTypes: Array.isArray(body.enabledTypes) ? body.enabledTypes : [],
    answerLanguages: Array.isArray(body.answerLanguages) ? body.answerLanguages : [],
    correctionOptions: body.correctionOptions || {},
  }

  const existing = await payload.find({
    collection: 'user_test_preferences',
    where: { user: { equals: user.id } },
    limit: 1,
  })

  let result
  if (existing.docs[0]) {
    result = await payload.update({
      collection: 'user_test_preferences',
      id: existing.docs[0].id,
      data,
    })
  } else {
    result = await payload.create({
      collection: 'user_test_preferences',
      data,
    })
  }

  return NextResponse.json(result)
}
