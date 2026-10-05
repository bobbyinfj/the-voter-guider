// API Route: Manage voter guides
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getSessionId } from '@/lib/session'
import { handleApiError } from '@/lib/errors'
import { parseDistrictSelection } from '@/lib/districts'

const VISIBILITIES = new Set(['private', 'friends', 'public'])

const guideInclude = {
  choices: true,
  election: {
    include: {
      ballots: { orderBy: { number: Prisma.SortOrder.asc } },
      jurisdiction: true,
    },
  },
  jurisdiction: true,
} satisfies Prisma.GuideInclude

type GuideWithRelations = Prisma.GuideGetPayload<{ include: typeof guideInclude }>

// Never send the owner's session id: it is the bearer credential in the session cookie.
function toResponse(guide: GuideWithRelations, sessionId: string) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { sessionId: owner, userId, ...rest } = guide
  return { ...rest, isOwner: owner === sessionId }
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function districtsFrom(metadata: unknown) {
  const districts =
    metadata && typeof metadata === 'object' && 'districts' in metadata
      ? (metadata as { districts?: unknown }).districts
      : undefined
  return parseDistrictSelection(
    districts && typeof districts === 'object' ? (districts as Record<string, unknown>) : null,
  )
}

// GET ?id= (owner only) | ?shareToken= (anyone with the link unless private) | no params (my guides)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('shareToken')
    const guideId = searchParams.get('id')
    const sessionId = await getSessionId()

    if (guideId) {
      const guide = await prisma.guide.findFirst({
        where: { id: guideId, sessionId },
        include: guideInclude,
      })
      if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
      return NextResponse.json(toResponse(guide, sessionId))
    }

    if (shareToken) {
      const guide = await prisma.guide.findUnique({ where: { shareToken }, include: guideInclude })
      // A private guide is only visible to its owner, even with the link
      if (!guide || (guide.visibility === 'private' && guide.sessionId !== sessionId)) {
        return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
      }
      if (guide.sessionId !== sessionId) {
        await prisma.guideAnalytics
          .create({ data: { guideId: guide.id, eventType: 'view' } })
          .catch(() => undefined)
      }
      return NextResponse.json(toResponse(guide, sessionId))
    }

    const guides = await prisma.guide.findMany({
      where: { sessionId },
      select: {
        id: true,
        title: true,
        shareToken: true,
        visibility: true,
        updatedAt: true,
        election: { include: { jurisdiction: true } },
        _count: { select: { choices: true } },
      },
      orderBy: { updatedAt: Prisma.SortOrder.desc },
    })
    return NextResponse.json(guides)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// POST - Create a guide for an election
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = await getSessionId()

    const electionId = text(body.electionId, 100)
    const election = electionId
      ? await prisma.election.findUnique({ where: { id: electionId } })
      : null
    if (!election) {
      return NextResponse.json({ error: 'A valid electionId is required' }, { status: 400 })
    }

    const guide = await prisma.guide.create({
      data: {
        title: text(body.title, 200) ?? `My guide: ${election.title}`,
        author: text(body.author, 100),
        description: text(body.description, 2000),
        notes: text(body.notes, 10000),
        electionId: election.id,
        jurisdictionId: election.jurisdictionId,
        sessionId,
        visibility: VISIBILITIES.has(body.visibility) ? body.visibility : 'private',
        metadata: { districts: districtsFrom(body.metadata) },
      },
      include: guideInclude,
    })

    return NextResponse.json(toResponse(guide, sessionId))
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// PATCH - Update a guide the caller owns
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = await getSessionId()
    const id = text(body.id, 100)
    if (!id) return NextResponse.json({ error: 'Guide ID required' }, { status: 400 })

    const existing = await prisma.guide.findFirst({ where: { id, sessionId } })
    if (!existing) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

    const data: Prisma.GuideUpdateInput = { lastAccessedAt: new Date() }
    if (body.title !== undefined) data.title = text(body.title, 200) ?? existing.title
    if (body.author !== undefined) data.author = text(body.author, 100)
    if (body.description !== undefined) data.description = text(body.description, 2000)
    if (body.notes !== undefined) data.notes = text(body.notes, 10000)
    if (body.visibility !== undefined && VISIBILITIES.has(body.visibility)) {
      data.visibility = body.visibility
    }
    if (body.districts !== undefined) {
      data.metadata = { districts: districtsFrom({ districts: body.districts }) }
    }

    const guide = await prisma.guide.update({ where: { id }, data, include: guideInclude })
    return NextResponse.json(toResponse(guide, sessionId))
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// DELETE - Delete a guide the caller owns
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guideId = searchParams.get('id')
    const sessionId = await getSessionId()
    if (!guideId) return NextResponse.json({ error: 'Guide ID required' }, { status: 400 })

    const { count } = await prisma.guide.deleteMany({ where: { id: guideId, sessionId } })
    if (!count) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
