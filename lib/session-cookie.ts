// Anonymous session cookie settings, shared by the proxy (which issues the cookie on a
// visitor's first request) and getSessionId()
export const SESSION_COOKIE = 'voter-guide-session'

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
}
