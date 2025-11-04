// API Route: Get jurisdictions (precinct-level preferred, fallback to all)
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // First try to get precinct-level jurisdictions
    let jurisdictions = await prisma.jurisdiction.findMany({
      where: {
        type: 'precinct',
      },
      include: {
        precincts: {
          orderBy: { number: Prisma.SortOrder.asc },
        },
      },
      orderBy: [
        { state: Prisma.SortOrder.asc },
        { name: Prisma.SortOrder.asc },
      ],
    })

    // If no precinct-level jurisdictions exist, return all jurisdictions
    // This handles the case where the database hasn't been seeded yet
    if (jurisdictions.length === 0) {
      console.log('No precinct-level jurisdictions found, returning all jurisdictions')
      jurisdictions = await prisma.jurisdiction.findMany({
      include: {
        precincts: {
          orderBy: { number: Prisma.SortOrder.asc },
        },
      },
      orderBy: [
        { state: Prisma.SortOrder.asc },
        { name: Prisma.SortOrder.asc },
      ],
      })
    }

    return NextResponse.json(jurisdictions)
  } catch (error) {
    console.error('Error fetching jurisdictions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch jurisdictions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

