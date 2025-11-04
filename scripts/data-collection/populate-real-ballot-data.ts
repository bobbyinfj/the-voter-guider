/**
 * Data Collection Script: Populate Real Ballot Data
 * 
 * This script ensures real ballot data is fetched and stored in the database
 * for all configured jurisdictions. It should be run after seeding the database.
 * 
 * Usage:
 *   npx tsx scripts/data-collection/populate-real-ballot-data.ts
 * 
 * Or via npm script:
 *   npm run data:populate-ballots
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fetchGoogleCivicData, convertGoogleCivicToBallotItems } from '../../lib/api-collectors/google-civic'

config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Sample addresses for fetching real data
const addresses = {
  'Monterey Park Voting Districts': '123 W Garvey Ave, Monterey Park, CA 91754',
  'Fort Collins Voting Districts': '300 Laporte Ave, Fort Collins, CO 80521',
  'Seattle Voting Districts': '600 4th Ave, Seattle, WA 98104',
}

async function populateRealBallotData() {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY

  if (!apiKey) {
    console.error('❌ GOOGLE_CIVIC_API_KEY not found in .env.local')
    console.error('')
    console.error('Please add your Google Civic API key to .env.local:')
    console.error('  GOOGLE_CIVIC_API_KEY=your_api_key_here')
    console.error('')
    console.error('Get a free API key at: https://console.cloud.google.com/')
    console.error('  (Enable "Civic Information API")')
    process.exit(1)
  }

  console.log('🚀 Populating real ballot data from Google Civic API...\n')

  // Get all precinct-level jurisdictions
  const jurisdictions = await prisma.jurisdiction.findMany({
    where: {
      type: 'precinct',
      name: {
        in: ['Monterey Park Voting Districts', 'Fort Collins Voting Districts', 'Seattle Voting Districts'],
      },
    },
    include: {
      elections: {
        orderBy: { electionDate: 'desc' },
        take: 1, // Get the most recent election
      },
    },
  })

  if (jurisdictions.length === 0) {
    console.error('❌ No jurisdictions found. Run `npm run seed` first.')
    process.exit(1)
  }

  let totalBallotsFetched = 0
  let totalElectionsUpdated = 0

  for (const jurisdiction of jurisdictions) {
    const address = addresses[jurisdiction.name as keyof typeof addresses]
    if (!address) {
      console.log(`⚠️  No address configured for ${jurisdiction.name}, skipping...`)
      continue
    }

    console.log(`\n📥 Fetching data for ${jurisdiction.name}...`)
    console.log(`   Address: ${address}`)

    try {
      const civicData = await fetchGoogleCivicData(address, apiKey)

      if (!civicData || !civicData.contests || civicData.contests.length === 0) {
        console.log(`   ⚠️  No contests found (may be no upcoming election)`)
        continue
      }

      const ballotItems = convertGoogleCivicToBallotItems(civicData.contests)
      console.log(`   ✅ Found ${ballotItems.length} real ballot items`)

      // Find or create election for this jurisdiction
      let election = jurisdiction.elections[0]

      if (!election || election.electionDate.toISOString().split('T')[0] !== civicData.election.electionDay) {
        // Create new election or update existing
        election = await prisma.election.upsert({
          where: {
            id: `election-${jurisdiction.id}-${civicData.election.electionDay}`,
          },
          update: {
            title: civicData.election.name,
            electionDate: new Date(civicData.election.electionDay),
          },
          create: {
            id: `election-${jurisdiction.id}-${civicData.election.electionDay}`,
            jurisdictionId: jurisdiction.id,
            title: civicData.election.name,
            electionDate: new Date(civicData.election.electionDay),
            type: 'general',
            status: 'upcoming',
          },
        })
        totalElectionsUpdated++
        console.log(`   ✅ Created/updated election: ${election.title}`)
      }

      // Delete all sample ballots for this election
      const deletedCount = await prisma.ballot.deleteMany({
        where: {
          electionId: election.id,
          metadata: {
            path: ['isSample'],
            equals: true,
          },
        },
      })
      if (deletedCount.count > 0) {
        console.log(`   🗑️  Deleted ${deletedCount.count} sample ballot items`)
      }

      // Create/update real ballot items
      for (const ballotItem of ballotItems) {
        const ballotId = `ballot-${election.id}-${ballotItem.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`

        await prisma.ballot.upsert({
          where: { id: ballotId },
          update: {
            title: ballotItem.title,
            description: ballotItem.description,
            type: ballotItem.type,
            options: ballotItem.options,
            number: ballotItem.number,
            metadata: {
              ...ballotItem.metadata,
              source: 'Google Civic Information API',
              fetchedAt: new Date().toISOString(),
              isSample: false,
            },
          },
          create: {
            id: ballotId,
            electionId: election.id,
            number: ballotItem.number,
            title: ballotItem.title,
            description: ballotItem.description,
            type: ballotItem.type,
            options: ballotItem.options,
            metadata: {
              ...ballotItem.metadata,
              source: 'Google Civic Information API',
              fetchedAt: new Date().toISOString(),
              isSample: false,
            },
          },
        })
        totalBallotsFetched++
      }

      console.log(`   ✅ Stored ${ballotItems.length} real ballot items`)
    } catch (error) {
      console.error(`   ❌ Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      if (error instanceof Error && error.message.includes('API key')) {
        console.error(`   Make sure GOOGLE_CIVIC_API_KEY is valid`)
      }
    }
  }

  console.log('\n✅ Data collection complete!')
  console.log(`   - Elections updated: ${totalElectionsUpdated}`)
  console.log(`   - Ballot items fetched: ${totalBallotsFetched}`)
  console.log('')
  console.log('📊 Database now contains real ballot data (no sample data warnings)')
}

populateRealBallotData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

