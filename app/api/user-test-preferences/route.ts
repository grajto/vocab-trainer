import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { getUser } from '@/src/lib/getUser'

function isMissingDbObjectError(error: unknown): boolean {
  let current: unknown = error
  for (let i = 0; i < 6 && current; i += 1) {
    const candidate = current as { code?: string; message?: string; cause?: unknown }
    const code = candidate?.code
    const message = String(candidate?.message || '').toLowerCase()
    if (code === '42P01' || code === '42703') return true
    if (message.includes('relation') && message.includes('does not exist')) return true
    if (message.includes('column') && message.includes('does not exist')) return true
    current = candidate?.cause
  }
  return false
}

function defaultPrefs(userId: string | number) {
  return {
    user: userId,
    questionCount: 20,
    starredOnly: false,
    enabledTypes: ['abcd', 'translate', 'sentence', 'describe'],
    answerLanguages: ['pl', 'en'],
    correctionOptions: {},
  }
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const payload = await getPayload()
    const existing = await payload.find({
      collection: 'user_test_preferences',
      where: { user: { equals: user.id } },
      limit: 1,
    })

    return NextResponse.json(existing.docs[0] || defaultPrefs(user.id))
  } catch (error: unknown) {
    if (isMissingDbObjectError(error)) {
      return NextResponse.json(defaultPrefs(user.id))
    }
    console.error('User test preferences GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = {
    user: user.id,
    questionCount: Math.min(Math.max(Number(body.questionCount) || 10, 5), 50),
    starredOnly: !!body.starredOnly,
    enabledTypes: Array.isArray(body.enabledTypes) ? body.enabledTypes : [],
    answerLanguages: Array.isArray(body.answerLanguages) ? body.answerLanguages : [],
    correctionOptions: body.correctionOptions || {},
  }

  try {
    const payload = await getPayload()
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
  } catch (error: unknown) {
    if (isMissingDbObjectError(error)) {
      return NextResponse.json(data)
    }
    console.error('User test preferences POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
