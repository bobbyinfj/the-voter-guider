// API Route: Manage choices (voting selections)
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionId } from '@/lib/session'

// POST - Create or update choice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = getSessionId()

    // Verify guide belongs to session
    const guide = await prisma.guide.findFirst({
      where: {
        id: body.guideId,
        sessionId,
      },
    })

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found or unauthorized' },
        { status: 404 }
      )
    }

    // Upsert choice
    const choice = await prisma.choice.upsert({
      where: {
        guideId_ballotId: {
          guideId: body.guideId,
          ballotId: body.ballotId,
        },
      },
      update: {
        selection: body.selection,
        notes: body.notes,
      },
      create: {
        guideId: body.guideId,
        ballotId: body.ballotId,
        selection: body.selection,
        notes: body.notes,
      },
    })

    // Update guide's lastAccessedAt
    await prisma.guide.update({
      where: { id: body.guideId },
      data: { lastAccessedAt: new Date() },
    })

    return NextResponse.json(choice)
  } catch (error) {
    console.error('Error saving choice:', error)
    return NextResponse.json(
      { error: 'Failed to save choice' },
      { status: 500 }
    )
  }
}

// DELETE - Remove choice
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guideId = searchParams.get('guideId')
    const ballotId = searchParams.get('ballotId')
    const sessionId = getSessionId()

    if (!guideId || !ballotId) {
      return NextResponse.json(
        { error: 'Guide ID and Ballot ID required' },
        { status: 400 }
      )
    }

    // Verify guide belongs to session
    const guide = await prisma.guide.findFirst({
      where: {
        id: guideId,
        sessionId,
      },
    })

    if (!guide) {
      return NextResponse.json(
        { error: 'Guide not found or unauthorized' },
        { status: 404 }
      )
    }

    await prisma.choice.delete({
      where: {
        guideId_ballotId: {
          guideId,
          ballotId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting choice:', error)
    return NextResponse.json(
      { error: 'Failed to delete choice' },
      { status: 500 }
    )
  }
}

