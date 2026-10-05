// API Route: Manage choices (voting selections)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionId } from '@/lib/session'
import { handleApiError } from '@/lib/errors'

const MEASURE_SELECTIONS = new Set(['YES', 'NO', 'ABSTAIN'])

// POST - Create or update a choice on a guide the caller owns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = await getSessionId()
    const { guideId, ballotId, selection } = body
    if (typeof guideId !== 'string' || typeof ballotId !== 'string' || typeof selection !== 'string') {
      return NextResponse.json({ error: 'guideId, ballotId and selection are required' }, { status: 400 })
    }

    const guide = await prisma.guide.findFirst({ where: { id: guideId, sessionId } })
    if (!guide) {
      return NextResponse.json({ error: 'Guide not found or unauthorized' }, { status: 404 })
    }

    // The ballot item must be on this guide's election, and the pick must be one of its options
    const ballot = await prisma.ballot.findFirst({ where: { id: ballotId, electionId: guide.electionId } })
    if (!ballot) return NextResponse.json({ error: 'Ballot item not found' }, { status: 404 })
    const options = Array.isArray(ballot.options) ? ballot.options.filter((o) => typeof o === 'string') : []
    const valid =
      ballot.type === 'candidate'
        ? options.includes(selection) || selection === 'ABSTAIN' || selection.startsWith('WRITE-IN:')
        : MEASURE_SELECTIONS.has(selection)
    if (!valid || selection.length > 200) {
      return NextResponse.json({ error: 'Invalid selection' }, { status: 400 })
    }
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined

    const choice = await prisma.choice.upsert({
      where: { guideId_ballotId: { guideId, ballotId } },
      update: { selection, notes },
      create: { guideId, ballotId, selection, notes },
    })
    await prisma.guide.update({ where: { id: guideId }, data: { lastAccessedAt: new Date() } })

    return NextResponse.json(choice)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

// DELETE - Remove a choice from a guide the caller owns
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guideId = searchParams.get('guideId')
    const ballotId = searchParams.get('ballotId')
    const sessionId = await getSessionId()
    if (!guideId || !ballotId) {
      return NextResponse.json({ error: 'Guide ID and Ballot ID required' }, { status: 400 })
    }

    const guide = await prisma.guide.findFirst({ where: { id: guideId, sessionId } })
    if (!guide) {
      return NextResponse.json({ error: 'Guide not found or unauthorized' }, { status: 404 })
    }

    await prisma.choice.deleteMany({ where: { guideId, ballotId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
