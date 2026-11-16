import { NextResponse, type NextRequest } from 'next/server'
import { NEW_SESSION_HEADER, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/session-cookie'

// Issue the anonymous session cookie before any page or API code runs. If each request
// minted its own (as getSessionId alone would), a visitor's first requests could race:
// two sessions, the last Set-Cookie wins, and a guide made under the other is lost.
export function proxy(request: NextRequest) {
  // Only the proxy says a session is new; drop any copy the client sent
  const hasSpoof = request.headers.has(NEW_SESSION_HEADER)
  if (request.cookies.has(SESSION_COOKIE)) {
    if (!hasSpoof) return NextResponse.next()
    const headers = new Headers(request.headers)
    headers.delete(NEW_SESSION_HEADER)
    return NextResponse.next({ request: { headers } })
  }
  const sessionId = crypto.randomUUID()
  request.cookies.set(SESSION_COOKIE, sessionId)
  const headers = new Headers(request.headers)
  headers.set(NEW_SESSION_HEADER, '1')
  const response = NextResponse.next({ request: { headers } })
  response.cookies.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
}
