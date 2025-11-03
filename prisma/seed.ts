// Seed script for initial jurisdiction and election data
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create jurisdictions
  const laCounty = await prisma.jurisdiction.upsert({
    where: { fipsCode: '06037' },
    update: {},
    create: {
      name: 'Los Angeles County',
      state: 'California',
      countyName: 'Los Angeles',
      fipsCode: '06037',
      type: 'county',
    },
  })

  const kingCounty = await prisma.jurisdiction.upsert({
    where: { fipsCode: '53033' },
    update: {},
    create: {
      name: 'King County',
      state: 'Washington',
      countyName: 'King',
      fipsCode: '53033',
      type: 'county',
    },
  })

  const larimerCounty = await prisma.jurisdiction.upsert({
    where: { fipsCode: '08069' },
    update: {},
    create: {
      name: 'Larimer County',
      state: 'Colorado',
      countyName: 'Larimer',
      fipsCode: '08069',
      type: 'county',
    },
  })

  console.log('✅ Created jurisdictions')

  // Create elections
  const caElection = await prisma.election.upsert({
    where: {
      id: 'ca-prop50-2025',
    },
    update: {},
    create: {
      id: 'ca-prop50-2025',
      jurisdictionId: laCounty.id,
      title: 'California Special Election - November 2025',
      description: 'Special election including Proposition 50',
      electionDate: new Date('2025-11-04'),
      type: 'special',
      status: 'upcoming',
      officialUrl: 'https://www.sos.ca.gov/elections',
    },
  })

  const waElection = await prisma.election.upsert({
    where: {
      id: 'wa-king-2025',
    },
    update: {},
    create: {
      id: 'wa-king-2025',
      jurisdictionId: kingCounty.id,
      title: 'King County Election - 2025',
      description: 'County-wide elections and ballot measures',
      electionDate: new Date('2025-11-04'),
      type: 'general',
      status: 'upcoming',
      officialUrl: 'https://www.kingcounty.gov/elections',
    },
  })

  const coElection = await prisma.election.upsert({
    where: {
      id: 'co-larimer-2025',
    },
    update: {},
    create: {
      id: 'co-larimer-2025',
      jurisdictionId: larimerCounty.id,
      title: 'Larimer County Election - November 2025',
      description: 'Coordinated election with ballot measures',
      electionDate: new Date('2025-11-04'),
      type: 'coordinated',
      status: 'upcoming',
      officialUrl: 'https://www.larimer.org/clerk/elections',
    },
  })

  console.log('✅ Created elections')

  // Create ballots for CA Prop 50
  const prop50 = await prisma.ballot.upsert({
    where: {
      id: 'ca-prop50',
    },
    update: {},
    create: {
      id: 'ca-prop50',
      electionId: caElection.id,
      number: 'Proposition 50',
      title: 'Election Rigging Response Act',
      description: 'Authorizes temporary redrawing of California congressional district maps in response to partisan redistricting efforts in other states.',
      type: 'proposition',
      options: ['YES', 'NO', 'ABSTAIN'],
      metadata: {
        fiscalImpact: 'One-time costs up to a few million dollars statewide',
        implementation: '2026-2030 elections',
      },
    },
  })

  // Create ballots for King County Prop 1
  const kingProp1 = await prisma.ballot.upsert({
    where: {
      id: 'wa-king-prop1',
    },
    update: {},
    create: {
      id: 'wa-king-prop1',
      electionId: waElection.id,
      number: 'Proposition 1',
      title: 'Automated Fingerprint Identification System (AFIS) Funding',
      description: 'Seven-year property tax levy to fund Regional AFIS',
      type: 'proposition',
      options: ['YES', 'NO', 'ABSTAIN'],
      metadata: {
        taxRate: '2.75 cents per $1,000 assessed value',
        duration: '2026-2032',
        cost: '$15-20 per year for median home',
      },
    },
  })

  // Create ballots for Larimer County
  const larimerTransport = await prisma.ballot.upsert({
    where: {
      id: 'co-larimer-transport',
    },
    update: {},
    create: {
      id: 'co-larimer-transport',
      electionId: coElection.id,
      number: 'Transportation Funding Measure',
      title: 'Sales and Use Tax for Transportation',
      description: '0.15% sales tax for transportation infrastructure improvements',
      type: 'measure',
      options: ['YES', 'NO', 'ABSTAIN'],
      metadata: {
        taxRate: '0.15%',
        revenue: '$15 million annually',
        duration: '15 years',
        exemptions: ['groceries', 'gasoline', 'diapers', 'prescription drugs'],
      },
    },
  })

  console.log('✅ Created ballot measures')
  console.log('🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

