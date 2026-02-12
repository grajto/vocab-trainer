import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'
import { createHmac } from 'crypto'

function signUsernameToken(username: string) {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('Missing PAYLOAD_SECRET')
  const payload = Buffer.from(JSON.stringify({ u: username, t: Date.now() })).toString('base64url')
  const signature = createHmac('sha256', secret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const username = typeof body.username === 'string' ? body.username.trim() : ''

    if (!username) {
      return NextResponse.json({ error: 'Wprowadź login.' }, { status: 400 })
    }

    const payload = await getPayload()
    const result = await payload.find({
      collection: 'users',
      where: { username: { equals: username } },
      limit: 1,
      depth: 0,
    })

    if (!result.docs[0]) {
      return NextResponse.json({ error: 'Nieprawidłowy login.' }, { status: 401 })
    }

    const token = signUsernameToken(username)

    const response = NextResponse.json({ ok: true, userId: result.docs[0].id })
    response.cookies.set('username-auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  } catch (error) {
    console.error('Login failed', error)
    return NextResponse.json({ error: 'Wystąpił błąd podczas logowania.' }, { status: 500 })
  }
}
