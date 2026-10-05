// API Route: Get elections for a jurisdiction
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'

const STATE_ABBREVIATIONS: Record<string, string> = {
  california: 'CA',
  colorado: 'CO',
  washington: 'WA',
}

function stateAliases(state: string): string[] {
  const abbreviation = STATE_ABBREVIATIONS[state.trim().toLowerCase()] ?? state.trim().toUpperCase()
  const fullNames = Object.keys(STATE_ABBREVIATIONS).filter(
    (name) => STATE_ABBREVIATIONS[name] === abbreviation,
  )
  return [abbreviation, ...fullNames.map((n) => n[0].toUpperCase() + n.slice(1))]
}

function startOfTodayUtc(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const electionId = searchParams.get('id')
    const jurisdictionId = searchParams.get('jurisdictionId')
    const status = searchParams.get('status') || 'upcoming'

    // Single election lookup by id
    if (electionId) {
      const election = await prisma.election.findUnique({
        where: { id: electionId },
        include: { jurisdiction: true },
      })
      if (!election) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json(election)
    }

    if (!jurisdictionId) {
      return NextResponse.json(
        { error: 'Jurisdiction ID required' },
        { status: 400 }
      )
    }

    // Statewide elections (e.g. the Nov 2026 general) hang off the state jurisdiction,
    // so include them for any jurisdiction in that state. Older precinct-level
    // jurisdictions spell the state out ("Washington"), newer ones use "WA".
    const selected = await prisma.jurisdiction.findUnique({ where: { id: jurisdictionId } })
    const stateNames = selected ? stateAliases(selected.state) : []

    const elections = await prisma.election.findMany({
      where: {
        status,
        // "upcoming" means on or after today, even if a stale row says otherwise
        ...(status === 'upcoming' ? { electionDate: { gte: startOfTodayUtc() } } : {}),
        OR: [
          { jurisdictionId },
          ...(stateNames.length
            ? [{ jurisdiction: { type: 'state', state: { in: stateNames } } }]
            : []),
        ],
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

