// Guide payloads shared by the guide API routes and the election page
import { Prisma } from '@/generated/prisma/client'
import { parseDistrictSelection } from '@/lib/districts'
import { snippetCandidates } from '@/lib/profile'
import { isOwner, type Viewer } from '@/lib/owner'

export const guideInclude = {
  choices: true,
  answers: { select: { questionId: true } },
  election: {
    include: {
      ballots: {
        orderBy: { number: Prisma.SortOrder.asc },
        // Party and incumbency for the ballot view; races link to their office page
        include: {
          office: {
            select: {
              id: true,
              district: true,
              candidates: {
                select: { id: true, name: true, party: true, incumbent: true, shortBio: true, website: true, profile: true },
              },
            },
          },
        },
      },
      jurisdiction: true,
    },
  },
  jurisdiction: true,
} satisfies Prisma.GuideInclude

type GuideWithRelations = Prisma.GuideGetPayload<{ include: typeof guideInclude }>

// Never send the owner's session id (the bearer credential in the session cookie), user id
// or default-guide key
export function toResponse(guide: GuideWithRelations, viewer: Viewer) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionId, userId, defaultKey, ...rest } = guide
  return {
    ...rest,
    election: {
      ...rest.election,
      ballots: rest.election.ballots.map((b) => ({
        ...b,
        office: b.office && { ...b.office, candidates: snippetCandidates(b.office.candidates) },
      })),
    },
    isOwner: isOwner(guide, viewer),
    isDefault: !!defaultKey,
  }
}

export function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

export function districtsFrom(metadata: unknown) {
  const districts =
    metadata && typeof metadata === 'object' && 'districts' in metadata
      ? (metadata as { districts?: unknown }).districts
      : undefined
  return parseDistrictSelection(
    districts && typeof districts === 'object' ? (districts as Record<string, unknown>) : null,
  )
}

