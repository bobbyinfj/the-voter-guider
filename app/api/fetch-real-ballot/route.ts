/**
 * API Route: Fetch real ballot data for a jurisdiction/address
 * Uses Google Civic Information API to get actual ballot data
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGoogleCivicData, convertGoogleCivicToBallotItems } from '@/lib/api-collectors/google-civic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { address, jurisdictionId, electionId } = body

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required to fetch real ballot data' },
        { status: 400 }
      )
    }

    const googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY
    if (!googleCivicApiKey) {
      return NextResponse.json(
        { 
          error: 'Google Civic API key not configured',
          message: 'Add GOOGLE_CIVIC_API_KEY to your .env.local file. Get a free key at https://console.cloud.google.com/'
        },
        { status: 400 }
      )
    }

    // Fetch real ballot data from Google Civic API
    const civicData = await fetchGoogleCivicData(address, googleCivicApiKey, electionId)

    if (!civicData || !civicData.contests || civicData.contests.length === 0) {
      return NextResponse.json(
        { 
          error: 'No ballot data found',
          message: 'No contests found for this address. Try a more specific address with city and state.',
          suggestion: 'Make sure to include: "123 Main St, City, State ZIP"'
        },
        { status: 404 }
      )
    }

    // Convert to standardized format
    const ballotItems = convertGoogleCivicToBallotItems(civicData.contests)

    // If jurisdictionId provided, update the database
    if (jurisdictionId && civicData.election) {
      const election = await prisma.election.upsert({
        where: {
          id: electionId || `election-${jurisdictionId}-${civicData.election.electionDay}`,
        },
        update: {
          title: civicData.election.name,
          electionDate: new Date(civicData.election.electionDay),
        },
        create: {
          jurisdictionId,
          title: civicData.election.name,
          electionDate: new Date(civicData.election.electionDay),
          type: 'general',
          status: 'upcoming',
        },
      })

      // Create/update ballot items
      const createdBallots = []
      for (const ballotItem of ballotItems) {
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
        pollingLocations: civicData.pollingLocations,
        earlyVoteSites: civicData.earlyVoteSites,
        source: 'Google Civic Information API',
      })
    }

    // Just return the data without saving
    return NextResponse.json({
      success: true,
      election: civicData.election,
      ballots: ballotItems,
      pollingLocations: civicData.pollingLocations,
      earlyVoteSites: civicData.earlyVoteSites,
      source: 'Google Civic Information API',
    })
  } catch (error) {
    console.error('Error fetching real ballot data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch ballot data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

