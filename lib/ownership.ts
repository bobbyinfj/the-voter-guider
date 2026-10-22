// Who owns a guide (pure; lib/owner.ts adds the request and database side)
import type { Prisma } from '@/generated/prisma/client'

export interface Viewer {
  sessionId: string
  userId: string | null
  email: string | null
}

// Signed out: guides made in this browser that no account has claimed. (Never just
// { userId: null }: that would match every anonymous guide in the database.)
// Signed in: the account's guides, plus any this browser made since signing in.
export function ownedBy(viewer: Viewer): Prisma.GuideWhereInput {
  const browser: Prisma.GuideWhereInput = { sessionId: viewer.sessionId, userId: null }
  return viewer.userId ? { OR: [{ userId: viewer.userId }, browser] } : browser
}

export function isOwner(guide: { sessionId: string | null; userId: string | null }, viewer: Viewer): boolean {
  if (guide.userId) return guide.userId === viewer.userId
  return !!guide.sessionId && guide.sessionId === viewer.sessionId
}

export function ownerKey(viewer: Viewer): string {
  return viewer.userId ? `u:${viewer.userId}` : `s:${viewer.sessionId}`
}

export function defaultKeyFor(viewer: Viewer, electionId: string): string {
  return `${ownerKey(viewer)}:${electionId}`
}
