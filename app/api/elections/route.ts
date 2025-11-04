// API Route: Get elections for a jurisdiction
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jurisdictionId = searchParams.get('jurisdictionId')
    const status = searchParams.get('status') || 'upcoming'

    if (!jurisdictionId) {
      return NextResponse.json(
        { error: 'Jurisdiction ID required' },
        { status: 400 }
      )
    }

    const elections = await prisma.election.findMany({
      where: {
        jurisdictionId,
        status,
      },
      include: {
        jurisdiction: true,
        ballots: {
          orderBy: { number: Prisma.SortOrder.asc },
        },
        _count: {
          select: { guides: true },
        },
      },
      orderBy: { electionDate: Prisma.SortOrder.asc },
    })

    return NextResponse.json(elections)
  } catch (error) {
    console.error('Error fetching elections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch elections' },
      { status: 500 }
    )
  }
}

