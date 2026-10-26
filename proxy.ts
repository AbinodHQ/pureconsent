import { NextRequest, NextResponse } from 'next/server'

export function proxy (request: NextRequest) {
  const headers = new Headers(request.headers)
  headers.set('x-pc-pathname', request.nextUrl.pathname)
  const response = NextResponse.next({ request: { headers } })
  const legacy = request.cookies.get('pc_session')?.value
  if (
    ['pureconsent.de', 'com.pureconsent.de'].includes(
      request.nextUrl.hostname
    ) &&
    !request.cookies.has('pc_session_v2') &&
    legacy &&
    /^[a-f0-9]{64}$/.test(legacy)
  )
    response.cookies.set('pc_session_v2', legacy, {
      domain: '.pureconsent.de',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 86400
    })
  return response
}

export const config = {
  matcher: [
    '/',
    '/dashboard/:path*',
    '/docs/:path*',
    '/privacy',
    '/terms',
    '/auth/:path*'
  ]
}
