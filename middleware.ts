import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const appToken = process.env.APP_ACCESS_TOKEN

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
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-app-token', appToken)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  const isApiPath = pathname.startsWith('/api')
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
