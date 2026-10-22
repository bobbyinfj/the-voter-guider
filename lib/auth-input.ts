// Validating what people type or click for sign-in (pure, so it's unit-tested)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null
}

// Only same-site paths, so a link can't be used to bounce someone to another site
export function safeNext(value: unknown): string {
  return typeof value === 'string' && /^\/(?!\/)[\w\-./?=&%#]*$/.test(value) && !value.includes('\\') ? value : '/'
}
