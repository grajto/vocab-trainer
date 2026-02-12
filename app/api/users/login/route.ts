'use server'

import { NextResponse } from 'next/server'
import { getPayload } from '@/src/lib/getPayload'

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

    const response = NextResponse.json({ ok: true, userId: result.docs[0].id })
    response.cookies.set('username-auth', username, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    })
    return response
  } catch (error) {
    console.error('Login failed', error)
    return NextResponse.json({ error: 'Wystąpił błąd podczas logowania.' }, { status: 500 })
  }
}
