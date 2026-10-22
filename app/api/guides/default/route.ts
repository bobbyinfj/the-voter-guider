// API Route: the guide an election's ballot saves to (created on the first check)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getOrCreateDefaultGuide, getViewer } from '@/lib/owner'
import { handleApiError } from '@/lib/errors'
import { districtsFrom, guideInclude, text, toResponse } from '@/lib/guides'

// POST { electionId, districts? } → your default guide for that election
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const electionId = text(body.electionId, 100)
    const election = electionId ? await prisma.election.findUnique({ where: { id: electionId } }) : null
    if (!election) return NextResponse.json({ error: 'A valid electionId is required' }, { status: 400 })

    const viewer = await getViewer()
    const created = await getOrCreateDefaultGuide(viewer, election, districtsFrom({ districts: body.districts }))
    const guide = await prisma.guide.findUniqueOrThrow({ where: { id: created.id }, include: guideInclude })
    return NextResponse.json(toResponse(guide, viewer))
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
