// Optional accounts by emailed magic link. Signing in moves this browser's guides to the
// account so they follow you to other devices; nothing on the site requires it.
//
// - Links carry a random token; only its sha256 is stored. 15 minutes, single use.
// - The link opens a page whose button signs you in (POST). Mail scanners that pre-fetch
//   links therefore can't use up the token.
// - The link's host comes from APP_URL (or Vercel's production URL), never the request's
//   Host header.
import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { sendMail } from '@/lib/mail'
import { normalizeEmail, safeNext } from '@/lib/auth-input'

export { normalizeEmail, safeNext } from '@/lib/auth-input'

export const AUTH_COOKIE = 'voter-guide-auth'
const AUTH_DAYS = 90
const LINK_MINUTES = 15

const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const newToken = () => randomBytes(32).toString('base64url')

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return `http://localhost:${process.env.PORT || 3000}`
}

export async function currentUser(): Promise<{ id: string; email: string } | null> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value
  if (!token) return null
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hash(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true } } },
  })
  return session && session.expiresAt > new Date() ? session.user : null
}

export class RateLimited extends Error {}

// Limits on sign-in emails: per address, per browser, per network address, and overall (so a
// script can't use the site to spray email from the sending account)
const LIMITS = { email: 3, browser: 5, ip: 10, windowMinutes: 15, perHour: 200 }

export async function requestSignInLink(emailInput: unknown, sessionId: string, nextInput: unknown, ip: string | null) {
  const email = normalizeEmail(emailInput)
  if (!email) return { ok: false as const, error: 'Please enter a valid email address.' }
  const since = new Date(Date.now() - LIMITS.windowMinutes * 60_000)
  const ipHash = ip ? hash(`ip:${ip}`) : null
  const [forEmail, forBrowser, forIp, lastHour] = await Promise.all([
    prisma.loginToken.count({ where: { email, createdAt: { gt: since } } }),
    prisma.loginToken.count({ where: { sessionId, createdAt: { gt: since } } }),
    ipHash ? prisma.loginToken.count({ where: { ipHash, createdAt: { gt: since } } }) : 0,
    prisma.loginToken.count({ where: { createdAt: { gt: new Date(Date.now() - 3_600_000) } } }),
  ])
  if (forEmail >= LIMITS.email || forBrowser >= LIMITS.browser || forIp >= LIMITS.ip || lastHour >= LIMITS.perHour) {
    throw new RateLimited()
  }

  const token = newToken()
  const next = safeNext(nextInput)
  await prisma.loginToken.create({
    data: { tokenHash: hash(token), email, sessionId, ipHash, next, expiresAt: new Date(Date.now() + LINK_MINUTES * 60_000) },
  })
  const link = `${appUrl()}/signin/verify?token=${token}`
  await sendMail(
    email,
    'Your Voter Guider sign-in link',
    [
      'Open this link to sign in to The Voter Guider and keep your voter guides on any device:',
      '',
      link,
      '',
      `It works once and expires in ${LINK_MINUTES} minutes. If you didn't ask for it, you can ignore this email.`,
      '',
      'The Voter Guider is an unofficial, independent voter guide, not a government website.',
    ].join('\n'),
  )
  return { ok: true as const }
}

// Who a sign-in link is for (masked), without using it up: shown before the Sign in button so
// you can tell if someone sent you a link to their account
export async function previewToken(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null
  const login = await prisma.loginToken.findUnique({ where: { tokenHash: hash(token) }, select: { email: true, usedAt: true, expiresAt: true } })
  if (!login || login.usedAt || login.expiresAt < new Date()) return null
  const [name, domain] = login.email.split('@')
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`
}

// Use a sign-in link: returns where to go next, or null if the link is bad, used or expired
export async function signInWithToken(token: unknown): Promise<string | null> {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return null
  const tokenHash = hash(token)
  const login = await prisma.loginToken.findUnique({ where: { tokenHash } })
  if (!login || login.usedAt || login.expiresAt < new Date()) return null
  // Single use, even if two requests race
  const { count } = await prisma.loginToken.updateMany({ where: { id: login.id, usedAt: null }, data: { usedAt: new Date() } })
  if (!count) return null

  const user = await prisma.user.upsert({
    where: { email: login.email },
    create: { email: login.email, lastLoginAt: new Date() },
    update: { lastLoginAt: new Date() },
  })
  // Only the browser that asked for the link hands over its guides. Never the one clicking
  // it: otherwise anyone could mail you a link to their own account and collect your picks.
  if (login.sessionId) await claimGuides(user.id, [login.sessionId])

  const authToken = newToken()
  await prisma.authSession.create({
    data: { tokenHash: hash(authToken), userId: user.id, expiresAt: new Date(Date.now() + AUTH_DAYS * 86_400_000) },
  })
  ;(await cookies()).set(AUTH_COOKIE, authToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: AUTH_DAYS * 86_400,
    path: '/',
  })
  return login.next || '/'
}

// Move anonymous guides from these browsers to the account. Each "default" guide (the one an
// election's ballot saves to) becomes the account's default for that election unless the
// account already has one, in which case it stays as an extra guide.
async function claimGuides(userId: string, sessionIds: string[]) {
  const guides = await prisma.guide.findMany({
    where: { sessionId: { in: sessionIds }, userId: null },
    select: { id: true, electionId: true, defaultKey: true },
  })
  for (const g of guides) {
    let defaultKey: string | null = null
    if (g.defaultKey) {
      const key = `u:${userId}:${g.electionId}`
      const taken = await prisma.guide.findUnique({ where: { defaultKey: key }, select: { id: true } })
      defaultKey = taken ? null : key
    }
    await prisma.guide.update({ where: { id: g.id }, data: { userId, defaultKey } })
  }
}

export async function signOut() {
  const store = await cookies()
  const token = store.get(AUTH_COOKIE)?.value
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hash(token) } })
  store.delete(AUTH_COOKIE)
}
