// Utility functions for sessions
import { cookies, headers } from 'next/headers'
import { NEW_SESSION_HEADER, SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/session-cookie'

// The proxy normally issues the cookie first; this is the fallback for requests it skips
export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    cookieStore.set(SESSION_COOKIE, sessionId, SESSION_COOKIE_OPTIONS)
  }

  return sessionId
}

// True when the proxy issued this request's session cookie just now (see NEW_SESSION_HEADER)
export async function isNewSession(): Promise<boolean> {
  return (await headers()).get(NEW_SESSION_HEADER) === '1'
}
