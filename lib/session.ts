// Utility functions for sessions
import { cookies } from 'next/headers'
import { SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from '@/lib/session-cookie'

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
