/**
 * API Route: Collect ballot data from external APIs
 * This endpoint fetches real ballot data and updates the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchUnifiedBallotData, formatAddressForAPI } from '@/lib/api-collectors/unified-fetcher'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jurisdictionId, address, electionId } = body

    if (!jurisdictionId) {
      return NextResponse.json(
        { error: 'Jurisdiction ID required' },
        { status: 400 }
      )
    }

    // Get jurisdiction
    const jurisdiction = await prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
      include: { precincts: true },
    })

    if (!jurisdiction) {
      return NextResponse.json(
        { error: 'Jurisdiction not found' },
        { status: 404 }
      )
    }

    // Get API keys from environment
    const googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY
    const democracyWorksApiKey = process.env.DEMOCRACY_WORKS_API_KEY
    const ballotReadyApiKey = process.env.BALLOTREADY_API_KEY

    // Format address if provided, otherwise use jurisdiction center
    let formattedAddress = address
    if (!formattedAddress && jurisdiction.precincts.length > 0) {
      // Use first precinct's center as approximate address
      const firstPrecinct = jurisdiction.precincts[0]
      formattedAddress = formatAddressForAPI(
        'Main St', // Generic street
        jurisdiction.name.includes('Monterey Park') ? 'Monterey Park' :
        jurisdiction.name.includes('Fort Collins') ? 'Fort Collins' :
        'Fort Collins',
        jurisdiction.state,
        firstPrecinct.zipCodes[0]
      )
    }

    // Fetch ballot data from APIs
    const electionInfo = await fetchUnifiedBallotData(
      jurisdiction.name,
      jurisdiction.state,
      {
        googleCivicApiKey,
        democracyWorksApiKey,
        ballotReadyApiKey,
        address: formattedAddress,
        electionId,
      }
    )

    if (!electionInfo) {
      return NextResponse.json(
        { 
          error: 'No ballot data found from any API',
          message: 'Try providing a specific address or API keys in environment variables',
        },
        { status: 404 }
      )
    }

    // Find or create election
    const election = await prisma.election.upsert({
      where: {
        id: electionId || `election-${jurisdictionId}-${electionInfo.electionDate.toISOString().split('T')[0]}`,
      },
      update: {
        title: electionInfo.title,
        description: electionInfo.description,
        electionDate: electionInfo.electionDate,
        officialUrl: electionInfo.officialUrl,
      },
      create: {
        jurisdictionId: jurisdiction.id,
        title: electionInfo.title,
        description: electionInfo.description,
        electionDate: electionInfo.electionDate,
        type: electionInfo.type,
        status: 'upcoming',
        officialUrl: electionInfo.officialUrl,
      },
    })

    // Create or update ballot items
    const createdBallots = []
    for (const ballotItem of electionInfo.ballots) {
      const ballot = await prisma.ballot.upsert({
        where: {
          id: `ballot-${election.id}-${ballotItem.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
        },
        update: {
          title: ballotItem.title,
          description: ballotItem.description,
          type: ballotItem.type,
          options: ballotItem.options,
          metadata: ballotItem.metadata,
        },
        create: {
          electionId: election.id,
          number: ballotItem.number,
          title: ballotItem.title,
          description: ballotItem.description,
          type: ballotItem.type,
          options: ballotItem.options,
          metadata: ballotItem.metadata,
        },
      })
      createdBallots.push(ballot)
    }

    return NextResponse.json({
      success: true,
      election,
      ballots: createdBallots,
      pollingLocations: electionInfo.pollingLocations,
      earlyVoteSites: electionInfo.earlyVoteSites,
      deadlines: electionInfo.deadlines,
    })
  } catch (error) {
    console.error('Error collecting ballot data:', error)
    return NextResponse.json(
      { error: 'Failed to collect ballot data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


