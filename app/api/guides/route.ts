// API Route: Manage voter guides
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getViewer, isOwner, ownedBy } from '@/lib/owner'
import { handleApiError } from '@/lib/errors'
import { districtsFrom, guideInclude, text, toResponse } from '@/lib/guides'

const VISIBILITIES = new Set(['private', 'friends', 'public'])

// GET ?id= (owner only) | ?shareToken= (anyone with the link unless private) | no params (my guides)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('shareToken')
    const guideId = searchParams.get('id')
    const viewer = await getViewer()

    if (guideId) {
      const guide = await prisma.guide.findFirst({
        where: { AND: [{ id: guideId }, ownedBy(viewer)] },
        include: guideInclude,
      })
      if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
      return NextResponse.json(toResponse(guide, viewer))
    }

    if (shareToken) {
      const guide = await prisma.guide.findUnique({ where: { shareToken }, include: guideInclude })
      // A private guide is only visible to its owner, even with the link
      if (!guide || (guide.visibility === 'private' && !isOwner(guide, viewer))) {
        return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
      }
      if (!isOwner(guide, viewer)) {
        await prisma.guideAnalytics
          .create({ data: { guideId: guide.id, eventType: 'view' } })
          .catch(() => undefined)
      }
      return NextResponse.json(toResponse(guide, viewer))
    }

    const guides = await prisma.guide.findMany({
      where: ownedBy(viewer),
      select: {
        id: true,
        title: true,
        defaultKey: true,
        electionId: true,
        shareToken: true,
        visibility: true,
        updatedAt: true,
        election: { include: { jurisdiction: true } },
        _count: { select: { choices: true } },
      },
      orderBy: { updatedAt: Prisma.SortOrder.desc },
    })
    return NextResponse.json(guides.map(({ defaultKey, ...g }) => ({ ...g, isDefault: !!defaultKey })))
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// POST - Create a guide for an election
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const viewer = await getViewer()

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
        sessionId: viewer.sessionId,
        userId: viewer.userId,
        visibility: VISIBILITIES.has(body.visibility) ? body.visibility : 'private',
        metadata: { districts: districtsFrom(body.metadata) },
      },
      include: guideInclude,
    })

    return NextResponse.json(toResponse(guide, viewer))
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// PATCH - Update a guide the caller owns
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const viewer = await getViewer()
    const id = text(body.id, 100)
    if (!id) return NextResponse.json({ error: 'Guide ID required' }, { status: 400 })

    const existing = await prisma.guide.findFirst({ where: { AND: [{ id }, ownedBy(viewer)] } })
    if (!existing) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

    const data: Prisma.GuideUpdateInput = { lastAccessedAt: new Date() }
    if (body.title !== undefined) data.title = text(body.title, 200) ?? existing.title
    if (body.author !== undefined) data.author = text(body.author, 100)
    if (body.description !== undefined) data.description = text(body.description, 2000)
    if (body.notes !== undefined) data.notes = text(body.notes, 10000)
    if (body.visibility !== undefined && VISIBILITIES.has(body.visibility)) {
      data.visibility = body.visibility
    }
    if (typeof body.shareCommunity === 'boolean') data.shareCommunity = body.shareCommunity
    if (body.districts !== undefined) {
      const metadata = existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}
      data.metadata = { ...metadata, districts: districtsFrom({ districts: body.districts }) }
    }

    const guide = await prisma.guide.update({ where: { id }, data, include: guideInclude })
    return NextResponse.json(toResponse(guide, viewer))
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
    const viewer = await getViewer()
    if (!guideId) return NextResponse.json({ error: 'Guide ID required' }, { status: 400 })

    const { count } = await prisma.guide.deleteMany({ where: { AND: [{ id: guideId }, ownedBy(viewer)] } })
    if (!count) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
