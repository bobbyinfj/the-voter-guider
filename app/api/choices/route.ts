// API Route: Manage choices (voting selections)
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { getViewer, ownedBy } from '@/lib/owner'
import { handleApiError } from '@/lib/errors'

const SPECIAL = ['ABSTAIN', 'UNSURE', 'NOTES']
const MEASURE_SELECTIONS = new Set(['YES', 'NO', ...SPECIAL])
const STATUSES = new Set(['unsure', 'possible', 'tentative', 'decided'])
const SOFT = new Set(['unsure', 'possible', 'tentative'])

// POST - Create or update a choice on a guide the caller owns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const viewer = await getViewer()
    const { guideId, ballotId, selection } = body
    if (typeof guideId !== 'string' || typeof ballotId !== 'string' || typeof selection !== 'string') {
      return NextResponse.json({ error: 'guideId, ballotId and selection are required' }, { status: 400 })
    }

    const guide = await prisma.guide.findFirst({ where: { AND: [{ id: guideId }, ownedBy(viewer)] } })
    if (!guide) {
      return NextResponse.json({ error: 'Guide not found or unauthorized' }, { status: 404 })
    }

    // The ballot item must be on this guide's election, and the pick must be one of its options
    const ballot = await prisma.ballot.findFirst({ where: { id: ballotId, electionId: guide.electionId } })
    if (!ballot) return NextResponse.json({ error: 'Ballot item not found' }, { status: 404 })
    const options = Array.isArray(ballot.options) ? ballot.options.filter((o) => typeof o === 'string') : []
    const valid =
      ballot.type === 'candidate'
        ? options.includes(selection) || SPECIAL.includes(selection) || selection.startsWith('WRITE-IN:')
        : MEASURE_SELECTIONS.has(selection)
    if (!valid || selection.length > 200) {
      return NextResponse.json({ error: 'Invalid selection' }, { status: 400 })
    }
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined
    // Not sure / possibly / leaning / decided; unchanged when not sent
    const status = STATUSES.has(body.status) ? (body.status as string) : undefined
    // Notes per candidate, keyed by a name on this ballot item; unchanged when not sent
    let candidateNotes: Prisma.InputJsonObject | typeof Prisma.DbNull | undefined
    if (body.candidateNotes !== undefined) {
      if (!body.candidateNotes || typeof body.candidateNotes !== 'object' || Array.isArray(body.candidateNotes)) {
        return NextResponse.json({ error: 'Invalid candidate notes' }, { status: 400 })
      }
      const kept: Record<string, string> = {}
      for (const [name, text] of Object.entries(body.candidateNotes as Record<string, unknown>)) {
        if (!options.includes(name) || typeof text !== 'string') {
          return NextResponse.json({ error: 'Invalid candidate notes' }, { status: 400 })
        }
        if (text.trim()) kept[name] = text.slice(0, 5000)
      }
      candidateNotes = Object.keys(kept).length ? kept : Prisma.DbNull
    }

    // Soft labels on several options, each one of this item's options; unchanged when not sent,
    // cleared by null. Two or more, and the pick must be among them (the strongest leads).
    let marks: Prisma.InputJsonObject | typeof Prisma.DbNull | undefined
    if (body.marks === null) marks = Prisma.DbNull
    else if (body.marks !== undefined) {
      const entries = body.marks && typeof body.marks === 'object' && !Array.isArray(body.marks) ? Object.entries(body.marks) : []
      const isOption = (o: string) =>
        ballot.type === 'candidate' ? options.includes(o) || (o.startsWith('WRITE-IN:') && o.length <= 200) : o === 'YES' || o === 'NO'
      if (entries.length < 2 || !entries.every(([o, s]) => isOption(o) && SOFT.has(s as string)) || !(selection in body.marks)) {
        return NextResponse.json({ error: 'Invalid marks' }, { status: 400 })
      }
      marks = Object.fromEntries(entries) as Prisma.InputJsonObject
    }

    const choice = await prisma.choice.upsert({
      where: { guideId_ballotId: { guideId, ballotId } },
      update: { selection, notes, status, candidateNotes, marks },
      create: { guideId, ballotId, selection, notes, status, candidateNotes, marks },
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
    const viewer = await getViewer()
    if (!guideId || !ballotId) {
      return NextResponse.json({ error: 'Guide ID and Ballot ID required' }, { status: 400 })
    }

    const guide = await prisma.guide.findFirst({ where: { AND: [{ id: guideId }, ownedBy(viewer)] } })
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
