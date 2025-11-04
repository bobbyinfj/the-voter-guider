// API Route: Get precincts for a jurisdiction
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jurisdictionId = searchParams.get('jurisdictionId')

    if (!jurisdictionId) {
      return NextResponse.json(
        { error: 'Jurisdiction ID required' },
        { status: 400 }
      )
    }

    const precincts = await prisma.precinct.findMany({
      where: {
        jurisdictionId,
      },
      include: {
        jurisdiction: {
          select: {
            name: true,
            state: true,
          },
        },
      },
      orderBy: [
        { number: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(precincts)
  } catch (error) {
    console.error('Error fetching precincts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch precincts' },
      { status: 500 }
    )
  }
}

