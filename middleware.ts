import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPath = pathname === '/login'
  const isAssetPath = pathname.startsWith('/_next') || pathname.startsWith('/favicon')
  const isApiPath = pathname.startsWith('/api')

  // Allow public paths
  if (isAssetPath || isAdminPath || isLoginPath) {
    return NextResponse.next()
  }

  const payloadToken = request.cookies.get('payload-token')

  const fetchSite = request.headers.get('sec-fetch-site')
  const isTrustedRequest = fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none'

  if (APP_ACCESS_TOKEN && !payloadToken && isTrustedRequest) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-app-token', APP_ACCESS_TOKEN)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  if (isApiPath) {
    return NextResponse.next()
  }

  // Check for Payload CMS auth cookie ('payload-token' is Payload's default cookie name)
  if (!payloadToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
