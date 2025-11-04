// API Route: CRUD operations for voter guides
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionId } from '@/lib/session'
import { handleApiError } from '@/lib/errors'

// GET - Fetch guides for current session or by shareToken or id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const shareToken = searchParams.get('shareToken')
    const guideId = searchParams.get('id')
    const sessionId = searchParams.get('sessionId') || await getSessionId()

    // Common include structure
    const includeStructure = {
      choices: {
        include: {
          ballot: true,
        },
      },
      election: {
        include: {
          ballots: {
            orderBy: { number: 'asc' },
          },
          jurisdiction: true, // Include jurisdiction through election as fallback
        },
      },
      jurisdiction: true, // Direct jurisdiction relation
    }

    if (guideId) {
      // Fetch guide by ID
      const guide = await prisma.guide.findUnique({
        where: { id: guideId },
        include: includeStructure,
      })

      if (!guide) {
        return NextResponse.json(
          { error: 'Guide not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(guide)
    }

    if (shareToken) {
      // Fetch shared guide
      const guide = await prisma.guide.findUnique({
        where: { shareToken },
        include: includeStructure,
      })

      if (!guide) {
        return NextResponse.json(
          { error: 'Guide not found' },
          { status: 404 }
        )
      }

      // Track analytics
      try {
        await prisma.guideAnalytics.create({
          data: {
            guideId: guide.id,
            eventType: 'view',
          },
        })
      } catch (error) {
        // Ignore analytics errors
        console.warn('Failed to track analytics:', error)
      }

      return NextResponse.json(guide)
    }

    // Fetch user's guides
    const guides = await prisma.guide.findMany({
      where: { sessionId },
      include: {
        election: {
          include: {
            jurisdiction: true,
          },
        },
        _count: {
          select: { choices: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(guides)
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    )
  }
}

// POST - Create new guide (precinct-based preferred)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = await getSessionId()

    const guide = await prisma.guide.create({
      data: {
        title: body.title,
        author: body.author,
        description: body.description,
        electionId: body.electionId,
        jurisdictionId: body.jurisdictionId,
        precinctId: body.precinctId || null, // Use precinct if provided (smallest unit)
        sessionId,
        visibility: body.visibility || 'private', // public, private, or friends
        metadata: body.metadata || null,
      },
      include: {
        election: {
          include: {
            jurisdiction: true,
            ballots: {
              orderBy: { number: 'asc' },
            },
          },
        },
        jurisdiction: true,
        precinct: {
          include: {
            jurisdiction: true,
          },
        },
      },
    })

    return NextResponse.json(guide)
  } catch (error) {
    console.error('Error creating guide:', error)
    return NextResponse.json(
      { error: 'Failed to create guide' },
      { status: 500 }
    )
  }
}

// PATCH - Update guide
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const sessionId = await getSessionId()

    const guide = await prisma.guide.update({
      where: {
        id: body.id,
        sessionId, // Ensure user owns the guide
      },
      data: {
        title: body.title,
        author: body.author,
        description: body.description,
        visibility: body.visibility,
        lastAccessedAt: new Date(),
      },
    })

    return NextResponse.json(guide)
  } catch (error) {
    console.error('Error updating guide:', error)
    return NextResponse.json(
      { error: 'Failed to update guide' },
      { status: 500 }
    )
  }
}

// DELETE - Delete guide
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const guideId = searchParams.get('id')
    const sessionId = await getSessionId()

    if (!guideId) {
      return NextResponse.json(
        { error: 'Guide ID required' },
        { status: 400 }
      )
    }

    await prisma.guide.delete({
      where: {
        id: guideId,
        sessionId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guide:', error)
    return NextResponse.json(
      { error: 'Failed to delete guide' },
      { status: 500 }
    )
  }
}

