import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const appToken = process.env.APP_ACCESS_TOKEN
  const isApiPath = pathname.startsWith('/api')

  // Allow public paths
  if (
    pathname.startsWith('/admin') ||
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  if (appToken) {
    const response = NextResponse.next()
    const existing = request.cookies.get('app-access-token')?.value
    if (existing !== appToken) {
      response.cookies.set('app-access-token', appToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
    }
    return response
  }

  if (isApiPath) {
    return NextResponse.next()
  }

  // Check for Payload CMS auth cookie ('payload-token' is Payload's default cookie name)
  const token = request.cookies.get('payload-token')
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
