// Utility functions for sessions
import { cookies } from 'next/headers'

export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('voter-guide-session')?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    cookieStore.set('voter-guide-session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })
  }

  return sessionId
}
