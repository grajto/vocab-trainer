import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_ACCESS_TOKEN = process.env.APP_ACCESS_TOKEN
const APP_TOKEN_API_ALLOWLIST = [
  '/api/session',
  '/api/import',
  '/api/check-sentence',
  '/api/stats',
  '/api/decks',
  '/api/cards',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPath = pathname.startsWith('/admin')
  const isLoginPath = pathname === '/login'
  const isAssetPath = pathname.startsWith('/_next') || pathname.startsWith('/favicon')
  const isApiPath = pathname.startsWith('/api')
  const isAllowlistedApi = isApiPath && APP_TOKEN_API_ALLOWLIST.some(prefix => pathname.startsWith(prefix))

  // Allow public paths
  if (isAssetPath || isAdminPath || isLoginPath) {
    return NextResponse.next()
  }

  if (isApiPath && !APP_ACCESS_TOKEN) {
    return NextResponse.next()
  }

  const payloadToken = request.cookies.get('payload-token')

  const fetchSite = request.headers.get('sec-fetch-site')
  const normalizedFetchSite = fetchSite ?? ''
  const isTrustedRequest = normalizedFetchSite === 'same-origin' ||
    normalizedFetchSite === 'same-site' ||
    normalizedFetchSite === 'none'

  if (APP_ACCESS_TOKEN && !payloadToken && isTrustedRequest && (!isApiPath || isAllowlistedApi)) {
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
