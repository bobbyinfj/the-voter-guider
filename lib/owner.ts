// Who is looking, and which guides are theirs. Every API route that reads or writes a
// guide on someone's behalf goes through ownedBy() so signed-in and anonymous ownership
// can't drift apart.
import { prisma } from '@/lib/prisma'
import { getSessionId } from '@/lib/session'
import { currentUser } from '@/lib/auth'
import { defaultKeyFor, type Viewer } from '@/lib/ownership'

export { defaultKeyFor, isOwner, ownedBy, ownerKey, type Viewer } from '@/lib/ownership'

export async function getViewer(): Promise<Viewer> {
  const [sessionId, user] = await Promise.all([getSessionId(), currentUser()])
  return { sessionId, userId: user?.id ?? null, email: user?.email ?? null }
}

// The guide your checks on an election's ballot go to. Created on first use; the unique
// defaultKey means two first clicks at once still end up with one guide.
export async function getOrCreateDefaultGuide(
  viewer: Viewer,
  election: { id: string; title: string; jurisdictionId: string },
  districts: Record<string, string> = {},
) {
  const defaultKey = defaultKeyFor(viewer, election.id)
  const existing = await prisma.guide.findUnique({ where: { defaultKey } })
  if (existing) return existing
  try {
    return await prisma.guide.create({
      data: {
        defaultKey,
        title: `My ballot: ${election.title}`,
        electionId: election.id,
        jurisdictionId: election.jurisdictionId,
        sessionId: viewer.sessionId,
        userId: viewer.userId,
        visibility: 'private',
        metadata: { districts },
      },
    })
  } catch (error) {
    // Lost a race with another request creating the same default guide
    const winner = await prisma.guide.findUnique({ where: { defaultKey } })
    if (winner) return winner
    throw error
  }
}
