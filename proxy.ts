import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/session-cookie'

// Issue the anonymous session cookie before any page or API code runs. If each request
// minted its own (as getSessionId alone would), a visitor's first requests could race:
// two sessions, the last Set-Cookie wins, and a guide made under the other is lost.
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next()
  const sessionId = crypto.randomUUID()
  request.cookies.set(SESSION_COOKIE, sessionId)
  const response = NextResponse.next({ request: { headers: request.headers } })
  response.cookies.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS)
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)'],
}
