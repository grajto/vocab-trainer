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
  '/api/search',
  '/api/folders',
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
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  const originHost = origin ? new URL(origin).host : null
  const isSameOrigin = originHost && host ? originHost === host : false
  const isTrustedRequest = fetchSite === 'same-origin' ||
    fetchSite === 'same-site' ||
    fetchSite === 'none' ||
    isSameOrigin ||
    (!fetchSite && !origin)
  const shouldInjectAppToken = APP_ACCESS_TOKEN &&
    !payloadToken &&
    isTrustedRequest &&
    (!isApiPath || isAllowlistedApi)

  if (shouldInjectAppToken) {
    console.info('[middleware] Injecting app token', {
      pathname,
      fetchSite,
      origin,
      host,
      isAllowlistedApi,
      isTrustedRequest,
    })
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-app-token', APP_ACCESS_TOKEN)
    const response = NextResponse.next({ request: { headers: requestHeaders } })
    response.cookies.set('app-token', APP_ACCESS_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      secure: request.nextUrl.protocol === 'https:',
      path: '/',
    })
    return response
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
