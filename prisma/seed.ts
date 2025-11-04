// Seed script for precinct-based jurisdiction and election data
// Only creates precinct-level jurisdictions (no county/city duplicates)
import { PrismaClient } from '@prisma/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with precinct-based data...')

  // Check if precincts table exists
  try {
    await prisma.$queryRaw`SELECT 1 FROM precincts LIMIT 1`
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.error('❌ ERROR: The precincts table does not exist!')
      console.error('')
      console.error('Please run a migration first:')
      console.error('  npx prisma migrate dev --name add_precincts_table')
      console.error('')
      console.error('Or use db push (development only):')
      console.error('  npx prisma db push')
      console.error('')
      process.exit(1)
    }
    throw error
  }

  // Clean up: Delete any existing county/city jurisdictions that aren't needed
  // We'll only keep precinct-level jurisdictions
  await prisma.jurisdiction.deleteMany({
    where: {
      type: { in: ['county', 'city'] }
    }
  })
  console.log('🧹 Cleaned up redundant county/city jurisdictions')

  // Create base jurisdictions for precincts (these represent the voting districts)
  // Monterey Park Precincts (Los Angeles County, CA)
  const montereyParkJurisdiction = await prisma.jurisdiction.upsert({
    where: { fipsCode: '0603748848' },
    update: {},
    create: {
      name: 'Monterey Park Voting Districts',
      state: 'California',
      countyName: 'Los Angeles',
      fipsCode: '0603748848',
      type: 'precinct', // Changed from 'city' to 'precinct'
    },
  })

  // Fort Collins Precincts (Fort Collins, CO)
  const fortCollinsJurisdiction = await prisma.jurisdiction.upsert({
    where: { fipsCode: '0806927270' },
    update: {},
    create: {
      name: 'Fort Collins Voting Districts',
      state: 'Colorado',
      countyName: 'Larimer', // Fort Collins is in Larimer County
      fipsCode: '0806927270',
      type: 'precinct', // Changed from 'city' to 'precinct'
    },
  })

  // Seattle Precincts (King County, WA)
  const seattleJurisdiction = await prisma.jurisdiction.upsert({
    where: { fipsCode: '53033' },
    update: {},
    create: {
      name: 'Seattle Voting Districts',
      state: 'Washington',
      countyName: 'King',
      fipsCode: '53033',
      type: 'precinct',
    },
  })

  console.log('✅ Created precinct-level jurisdictions')

  // === MONTEREY PARK PRECINCTS ===
  // Approximate precincts for Monterey Park (typically 5-7 voting precincts)
  const mpPrecincts = [
    { number: '1', name: 'Monterey Park Precinct 1', centerLat: 34.0625, centerLng: -118.1233, zipCodes: ['91754'] },
    { number: '2', name: 'Monterey Park Precinct 2', centerLat: 34.0650, centerLng: -118.1200, zipCodes: ['91754'] },
    { number: '3', name: 'Monterey Park Precinct 3', centerLat: 34.0600, centerLng: -118.1250, zipCodes: ['91754'] },
    { number: '4', name: 'Monterey Park Precinct 4', centerLat: 34.0580, centerLng: -118.1180, zipCodes: ['91754'] },
    { number: '5', name: 'Monterey Park Precinct 5', centerLat: 34.0640, centerLng: -118.1220, zipCodes: ['91754'] },
  ]

  const createdMPPrecincts = []
  for (const precinct of mpPrecincts) {
    // Try to find existing precinct first
    const existing = await prisma.precinct.findFirst({
      where: {
        jurisdictionId: montereyParkJurisdiction.id,
        number: precinct.number,
      },
    })

    const created = existing 
      ? await prisma.precinct.update({
          where: { id: existing.id },
          data: {
            name: precinct.name,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 500) + 1000,
          },
        })
      : await prisma.precinct.create({
          data: {
            name: precinct.name,
            number: precinct.number,
            jurisdictionId: montereyParkJurisdiction.id,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 500) + 1000, // Approximate
          },
        })
    createdMPPrecincts.push(created)
  }

  // === FORT COLLINS PRECINCTS ===
  // Approximate precincts for Fort Collins (typically 20-30 precincts, we'll create sample ones)
  const fcPrecincts = [
    { number: '101', name: 'Fort Collins Precinct 101', centerLat: 40.5853, centerLng: -105.0844, zipCodes: ['80521'] },
    { number: '102', name: 'Fort Collins Precinct 102', centerLat: 40.5875, centerLng: -105.0820, zipCodes: ['80521'] },
    { number: '103', name: 'Fort Collins Precinct 103', centerLat: 40.5830, centerLng: -105.0860, zipCodes: ['80521'] },
    { number: '104', name: 'Fort Collins Precinct 104', centerLat: 40.5900, centerLng: -105.0800, zipCodes: ['80524'] },
    { number: '105', name: 'Fort Collins Precinct 105', centerLat: 40.5800, centerLng: -105.0880, zipCodes: ['80525'] },
    { number: '106', name: 'Fort Collins Precinct 106', centerLat: 40.5880, centerLng: -105.0830, zipCodes: ['80521'] },
    { number: '107', name: 'Fort Collins Precinct 107', centerLat: 40.5820, centerLng: -105.0850, zipCodes: ['80521'] },
    { number: '108', name: 'Fort Collins Precinct 108', centerLat: 40.5860, centerLng: -105.0810, zipCodes: ['80524'] },
  ]

  const createdFCPrecincts = []
  for (const precinct of fcPrecincts) {
    const existing = await prisma.precinct.findFirst({
      where: {
        jurisdictionId: fortCollinsJurisdiction.id,
        number: precinct.number,
      },
    })

    const created = existing
      ? await prisma.precinct.update({
          where: { id: existing.id },
          data: {
            name: precinct.name,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 800) + 1500,
          },
        })
      : await prisma.precinct.create({
          data: {
            name: precinct.name,
            number: precinct.number,
            jurisdictionId: fortCollinsJurisdiction.id,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 800) + 1500, // Approximate
          },
        })
    createdFCPrecincts.push(created)
  }

  // === SEATTLE PRECINCTS ===
  const seattlePrecincts = [
    { number: '1', name: 'Seattle Precinct 1', centerLat: 47.6062, centerLng: -122.3321, zipCodes: ['98101'] },
    { number: '2', name: 'Seattle Precinct 2', centerLat: 47.6080, centerLng: -122.3300, zipCodes: ['98101'] },
    { number: '3', name: 'Seattle Precinct 3', centerLat: 47.6040, centerLng: -122.3340, zipCodes: ['98104'] },
    { number: '4', name: 'Seattle Precinct 4', centerLat: 47.6100, centerLng: -122.3280, zipCodes: ['98102'] },
    { number: '5', name: 'Seattle Precinct 5', centerLat: 47.6020, centerLng: -122.3360, zipCodes: ['98104'] },
    { number: '6', name: 'Seattle Precinct 6', centerLat: 47.6120, centerLng: -122.3260, zipCodes: ['98102'] },
  ]

  const createdSeattlePrecincts = []
  for (const precinct of seattlePrecincts) {
    const existing = await prisma.precinct.findFirst({
      where: {
        jurisdictionId: seattleJurisdiction.id,
        number: precinct.number,
      },
    })

    const created = existing
      ? await prisma.precinct.update({
          where: { id: existing.id },
          data: {
            name: precinct.name,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 700) + 1200,
          },
        })
      : await prisma.precinct.create({
          data: {
            name: precinct.name,
            number: precinct.number,
            jurisdictionId: seattleJurisdiction.id,
            centerLat: precinct.centerLat,
            centerLng: precinct.centerLng,
            zipCodes: precinct.zipCodes,
            registeredVoters: Math.floor(Math.random() * 700) + 1200, // Approximate
          },
        })
    createdSeattlePrecincts.push(created)
  }

  console.log(`✅ Created ${createdMPPrecincts.length} Monterey Park precincts`)
  console.log(`✅ Created ${createdFCPrecincts.length} Fort Collins precincts`)
  console.log(`✅ Created ${createdSeattlePrecincts.length} Seattle precincts`)

  // === MONTEREY PARK ELECTION ===
  // Use the first Monterey Park precinct's jurisdiction for the election
  const montereyParkElection = await prisma.election.upsert({
    where: { id: 'monterey-park-2025' },
    update: {},
    create: {
      id: 'monterey-park-2025',
      jurisdictionId: montereyParkJurisdiction.id,
      title: 'Monterey Park General Municipal Election - November 2025',
      description: 'City Council election and local ballot measures',
      electionDate: new Date('2025-11-04'),
      type: 'general',
      status: 'upcoming',
      officialUrl: 'https://www.montereypark.ca.gov',
    },
  })

  // === FORT COLLINS ELECTION ===
  const fortCollinsElection = await prisma.election.upsert({
    where: { id: 'fort-collins-2025' },
    update: {},
    create: {
      id: 'fort-collins-2025',
      jurisdictionId: fortCollinsJurisdiction.id,
      title: 'Fort Collins Municipal Election - November 2025',
      description: 'City Council election and local ballot measures',
      electionDate: new Date('2025-11-04'),
      type: 'general',
      status: 'upcoming',
      officialUrl: 'https://www.fcgov.com/elections',
    },
  })

  // === SEATTLE ELECTION ===
  const seattleElection = await prisma.election.upsert({
    where: { id: 'wa-seattle-2025' },
    update: {},
    create: {
      id: 'wa-seattle-2025',
      jurisdictionId: seattleJurisdiction.id,
      title: 'Seattle General Election - November 2025',
      description: 'City Council election and local ballot measures',
      electionDate: new Date('2025-11-04'),
      type: 'general',
      status: 'upcoming',
      officialUrl: 'https://www.seattle.gov/elections',
    },
  })

  console.log('✅ Created elections')
  console.log('')
  
  // PRIORITY: Fetch REAL ballot data FIRST (if API key available)
  const apiKey = process.env.GOOGLE_CIVIC_API_KEY
  let realDataFetched = false
  
  if (apiKey) {
    console.log('🔍 API key found! Fetching REAL ballot data from Google Civic API...')
    console.log('   (Real data will be used - sample data will NOT be created if real data is available)')
    console.log('')
    
    try {
      const { fetchGoogleCivicData, convertGoogleCivicToBallotItems } = await import('../lib/api-collectors/google-civic')
      
      // Sample addresses for fetching real data
      const addresses = {
        'Monterey Park Voting Districts': '123 W Garvey Ave, Monterey Park, CA 91754',
        'Fort Collins Voting Districts': '300 Laporte Ave, Fort Collins, CO 80521',
        'Seattle Voting Districts': '600 4th Ave, Seattle, WA 98104',
      }
      
      const jurisdictions = [
        { id: montereyParkJurisdiction.id, name: 'Monterey Park Voting Districts', electionId: montereyParkElection.id },
        { id: fortCollinsJurisdiction.id, name: 'Fort Collins Voting Districts', electionId: fortCollinsElection.id },
        { id: seattleJurisdiction.id, name: 'Seattle Voting Districts', electionId: seattleElection.id },
      ]
      
      for (const jurisdiction of jurisdictions) {
        const address = addresses[jurisdiction.name as keyof typeof addresses]
        if (!address) continue
        
        console.log(`   📥 Fetching data for ${jurisdiction.name}...`)
        try {
          const civicData = await fetchGoogleCivicData(address, apiKey)
          
          if (civicData && civicData.contests && civicData.contests.length > 0) {
            const ballotItems = convertGoogleCivicToBallotItems(civicData.contests)
            console.log(`      ✅ Found ${ballotItems.length} real ballot items`)
            
            // Delete any existing sample ballots for this election
            await prisma.ballot.deleteMany({
              where: {
                electionId: jurisdiction.electionId,
                metadata: {
                  path: ['isSample'],
                  equals: true,
                },
              },
            })
            
            // Update election with real data
            await prisma.election.update({
              where: { id: jurisdiction.electionId },
              data: {
                title: civicData.election.name,
                electionDate: new Date(civicData.election.electionDay),
              },
            })
            
            // Create real ballot items
            for (const ballotItem of ballotItems) {
              const ballotId = `ballot-${jurisdiction.electionId}-${ballotItem.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`
              
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
                  electionId: jurisdiction.electionId,
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
            }
            console.log(`      ✅ Stored ${ballotItems.length} real ballot items`)
            realDataFetched = true
          } else {
            console.log(`      ⚠️  No contests found (may be no upcoming election)`)
          }
        } catch (error) {
          console.log(`      ⚠️  Error fetching data: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    } catch (error) {
      console.log(`   ⚠️  Could not fetch real data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } else {
    console.log('⚠️  No GOOGLE_CIVIC_API_KEY found in .env.local')
    console.log('   Will create sample data as fallback.')
    console.log('   To use real ballot data:')
    console.log('   1. Add GOOGLE_CIVIC_API_KEY to .env.local')
    console.log('   2. Run: npm run data:populate-ballots')
    console.log('')
  }
  
  // Only create sample data if NO real data was fetched
  const hasRealData = await prisma.ballot.count({
    where: {
      metadata: {
        path: ['isSample'],
        equals: false,
      },
    },
  })
  
  if (hasRealData === 0) {
    console.log('📝 Creating sample ballot data (fallback only - no real data available)...')
    
    // Delete any existing sample ballots first
    await prisma.ballot.deleteMany({
      where: {
        metadata: {
          path: ['isSample'],
          equals: true,
        },
      },
    })
    
    // Create sample ballots only as fallback
    await prisma.ballot.upsert({
      where: { id: 'mp-council-district-1' },
      update: {},
      create: {
        id: 'mp-council-district-1',
        electionId: montereyParkElection.id,
        number: 'City Council District 1',
        title: 'Monterey Park City Council - District 1 (SAMPLE)',
        description: 'Vote for one candidate for City Council Member representing District 1\n\n⚠️ This is sample data. Run `npm run data:populate-ballots` to get real ballot items.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Candidate C', 'Write-in'],
        metadata: {
          term: '4 years',
          district: 'District 1',
          isSample: true,
        },
      },
    })

    await prisma.ballot.upsert({
      where: { id: 'mp-measure-x' },
      update: {},
      create: {
        id: 'mp-measure-x',
        electionId: montereyParkElection.id,
        number: 'Measure X',
        title: 'Public Safety and Emergency Services Funding (SAMPLE)',
        description: 'Shall the City of Monterey Park adopt a 0.5% sales tax increase to fund public safety and emergency services?\n\n⚠️ This is sample data. Run `npm run data:populate-ballots` to get real ballot items.',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.5% sales tax',
          purpose: 'Public safety and emergency services',
          duration: 'Ongoing',
          isSample: true,
        },
      },
    })

    await prisma.ballot.upsert({
      where: { id: 'fc-mayor-2025' },
      update: {},
      create: {
        id: 'fc-mayor-2025',
        electionId: fortCollinsElection.id,
        number: 'Mayor',
        title: 'Fort Collins Mayor (SAMPLE)',
        description: 'Vote for one candidate for Mayor of Fort Collins\n\n⚠️ This is sample data. Run `npm run data:populate-ballots` to get real ballot items.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Write-in'],
        metadata: {
          term: '4 years',
          office: 'Mayor',
          isSample: true,
        },
      },
    })

    await prisma.ballot.upsert({
      where: { id: 'fc-measure-1' },
      update: {},
      create: {
        id: 'fc-measure-1',
        electionId: fortCollinsElection.id,
        number: 'Ballot Issue 1',
        title: 'Affordable Housing Fund (SAMPLE)',
        description: 'Shall the City of Fort Collins be authorized to create and fund an affordable housing program through a 0.25% sales tax increase?\n\n⚠️ This is sample data. Run `npm run data:populate-ballots` to get real ballot items.',
        type: 'measure',
        options: ['YES', 'NO'],
        metadata: {
          taxRate: '0.25% sales tax',
          purpose: 'Affordable housing',
          duration: '10 years',
          isSample: true,
        },
      },
    })

    await prisma.ballot.upsert({
      where: { id: 'wa-seattle-council-1' },
      update: {},
      create: {
        id: 'wa-seattle-council-1',
        electionId: seattleElection.id,
        number: 'City Council District 1',
        title: 'Seattle City Council - District 1 (SAMPLE)',
        description: 'Vote for one candidate for City Council Member representing District 1\n\n⚠️ This is sample data. Run `npm run data:populate-ballots` to get real ballot items.',
        type: 'candidate',
        options: ['Candidate A', 'Candidate B', 'Write-in'],
        metadata: {
          term: '4 years',
          district: 'District 1',
          isSample: true,
        },
      },
    })
    
    console.log('✅ Created sample ballot measures (fallback only)')
  } else {
    console.log('✅ Using real ballot data (no sample data created)')
  }
  
  console.log('')
  console.log('🎉 Seeding complete!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   - Jurisdictions: 3 (Monterey Park, Fort Collins, Seattle - all precinct-level)`)
  console.log(`   - Precincts: ${await prisma.precinct.count()}`)
  console.log(`   - Elections: ${await prisma.election.count()}`)
  
  // Check if we have real data or sample data
  const realBallotCount = await prisma.ballot.count({
    where: {
      metadata: {
        path: ['isSample'],
        equals: false,
      },
    },
  })
  const sampleBallotCount = await prisma.ballot.count({
    where: {
      metadata: {
        path: ['isSample'],
        equals: true,
      },
    },
  })
  
  console.log(`   - Ballot Items: ${await prisma.ballot.count()} (${realBallotCount} real, ${sampleBallotCount} sample)`)
  
  if (realBallotCount > 0) {
    console.log('')
    console.log('✅ Real ballot data is being used!')
    console.log('   No sample data warnings will appear for users.')
  } else if (apiKey) {
    console.log('')
    console.log('⚠️  API key found but no real data fetched (may be no upcoming elections)')
    console.log('   Sample data created as fallback. Run `npm run data:populate-ballots` to try again.')
  } else {
    console.log('')
    console.log('📥 Next step: Add GOOGLE_CIVIC_API_KEY to .env.local and run `npm run data:populate-ballots`')
    console.log('   This will replace sample data with real ballot data.')
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
