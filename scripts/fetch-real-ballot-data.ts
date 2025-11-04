/**
 * Script to automatically fetch real ballot data from Google Civic API
 * for the 3 sample areas: Monterey Park, Fort Collins, Larimer County
 * 
 * Run: npx tsx scripts/fetch-real-ballot-data.ts
 */

import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'
import { fetchGoogleCivicData, convertGoogleCivicToBallotItems } from '../lib/api-collectors/google-civic'

config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

// Sample addresses for the 3 areas
const sampleAddresses = {
  'Monterey Park': '123 W Garvey Ave, Monterey Park, CA 91754',
  'Fort Collins': '300 Laporte Ave, Fort Collins, CO 80521',
  'Seattle': '600 4th Ave, Seattle, WA 98104',
}

async function fetchAndStoreBallotData(jurisdictionName: string, address: string, jurisdictionId: string) {
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY
  
  if (!apiKey) {
    console.error(`❌ GOOGLE_CIVIC_API_KEY not found in .env.local`)
    console.error(`   Skipping ${jurisdictionName} - cannot fetch real data without API key`)
    return
  }

  console.log(`\n📥 Fetching real ballot data for ${jurisdictionName}...`)
  console.log(`   Address: ${address}`)

  try {
    const civicData = await fetchGoogleCivicData(address, apiKey)

    if (!civicData || !civicData.contests || civicData.contests.length === 0) {
      console.log(`   ⚠️  No ballot contests found for ${jurisdictionName}`)
      console.log(`   This might be because there's no upcoming election, or the address format needs adjustment`)
      return
    }

    const ballotItems = convertGoogleCivicToBallotItems(civicData.contests)
    console.log(`   ✅ Found ${ballotItems.length} ballot items`)

    // Create or update election
    const electionDate = new Date(civicData.election.electionDay)
    const electionId = `election-${jurisdictionId}-${electionDate.toISOString().split('T')[0]}`

    const election = await prisma.election.upsert({
      where: { id: electionId },
      update: {
        title: civicData.election.name,
        electionDate,
      },
      create: {
        id: electionId,
        jurisdictionId,
        title: civicData.election.name,
        electionDate,
        type: 'general',
        status: 'upcoming',
      },
    })

    // Delete old sample ballots and create real ones
    await prisma.ballot.deleteMany({
      where: {
        electionId: election.id,
        metadata: {
          path: ['isSample'],
          equals: true,
        },
      },
    })

    // Create/update ballot items
    for (const ballotItem of ballotItems) {
      const ballotId = `ballot-${election.id}-${ballotItem.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`
      
      await prisma.ballot.upsert({
        where: { id: ballotId },
        update: {
          title: ballotItem.title,
          description: ballotItem.description,
          type: ballotItem.type,
          options: ballotItem.options,
          metadata: {
            ...ballotItem.metadata,
            source: 'Google Civic Information API',
            fetchedAt: new Date().toISOString(),
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
          },
        },
      })
    }

    console.log(`   ✅ Created/updated election: ${election.title}`)
    console.log(`   ✅ Created/updated ${ballotItems.length} ballot items`)

  } catch (error) {
    console.error(`   ❌ Error fetching data for ${jurisdictionName}:`, error)
    if (error instanceof Error && error.message.includes('API key')) {
      console.error(`   Make sure GOOGLE_CIVIC_API_KEY is valid in .env.local`)
    }
  }
}

async function main() {
  console.log('🚀 Auto-fetching real ballot data from Google Civic API...\n')

  // Get the 3 jurisdictions
  const jurisdictions = await prisma.jurisdiction.findMany({
    where: {
      name: {
        in: ['Monterey Park Voting Districts', 'Fort Collins Voting Districts', 'Seattle Voting Districts'],
      },
    },
  })

  if (jurisdictions.length === 0) {
    console.error('❌ No jurisdictions found. Run `npm run seed` first.')
    process.exit(1)
  }

  // Map jurisdiction names to addresses
  const jurisdictionMap: Record<string, string> = {
    'Monterey Park Voting Districts': sampleAddresses['Monterey Park'],
    'Fort Collins Voting Districts': sampleAddresses['Fort Collins'],
    'Seattle Voting Districts': sampleAddresses['Seattle'],
  }

  for (const jurisdiction of jurisdictions) {
    const address = jurisdictionMap[jurisdiction.name]
    if (address) {
      await fetchAndStoreBallotData(jurisdiction.name, address, jurisdiction.id)
    }
  }

  console.log('\n✅ Auto-fetch complete!')
  console.log('\n📊 Summary:')
  const elections = await prisma.election.count()
  const ballots = await prisma.ballot.count()
  console.log(`   - Elections: ${elections}`)
  console.log(`   - Ballot Items: ${ballots}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })



