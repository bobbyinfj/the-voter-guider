// Anonymous session cookie settings, shared by the proxy (which issues the cookie on a
// visitor's first request) and getSessionId()
export const SESSION_COOKIE = 'voter-guide-session'

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
}

// Set by the proxy on the request (never trusted from the client) when it has just issued the
// session cookie: a session that new owns no guides, so pages can skip looking them up.
// Crawlers never keep cookies, so this keeps them from waking the database.
export const NEW_SESSION_HEADER = 'x-vg-new-session'
