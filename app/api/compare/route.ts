// API Route: what you can compare your picks with, for one election
//  - published guides (party slates, editorial boards, League of Women Voters, advocacy
//    guides), each pick with its source and the quote it rests on
//  - the community tally: picks from Voter Guider users who chose to share them, counted
//    anonymously, per contest only once at least COMMUNITY_MIN people have shared a pick
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'
import type { ComparisonMeta } from '@/lib/comparisons'

const COMMUNITY_MIN = 5

export async function GET(request: NextRequest) {
  try {
    const electionId = new URL(request.url).searchParams.get('electionId')
    if (!electionId || electionId.length > 100) {
      return NextResponse.json({ error: 'electionId required' }, { status: 400 })
    }

    const templates = await prisma.guide.findMany({
      where: { electionId, isTemplate: true, visibility: 'public' },
      select: {
        id: true,
        title: true,
        metadata: true,
        choices: { select: { ballotId: true, selection: true, sourceUrl: true, notes: true } },
      },
      orderBy: { title: 'asc' },
    })
    const guides = templates.flatMap((g) => {
      const meta = (g.metadata as { comparison?: ComparisonMeta } | null)?.comparison
      if (!meta) return []
      return [
        {
          id: g.id,
          name: g.title,
          ...meta,
          picks: Object.fromEntries(
            g.choices.map((c) => [c.ballotId, { selection: c.selection, source: c.sourceUrl, quote: c.notes }]),
          ),
        },
      ]
    })

    const shared = { electionId, isTemplate: false, shareCommunity: true }
    const [rows, sharers] = await Promise.all([
      prisma.choice.groupBy({
        by: ['ballotId', 'selection'],
        where: { guide: { is: shared }, selection: { notIn: ['ABSTAIN', 'UNSURE', 'NOTES'] }, status: { notIn: ['unsure', 'possible'] } },
        _count: { _all: true },
      }),
      prisma.guide.count({ where: shared }),
    ])
    const contests: Record<string, { total: number; picks: Record<string, number> }> = {}
    for (const r of rows) {
      // Write-ins are free text: count them together, never show the names
      const selection = r.selection.startsWith('WRITE-IN:') ? 'WRITE-IN' : r.selection
      const c = (contests[r.ballotId] ??= { total: 0, picks: {} })
      c.total += r._count._all
      c.picks[selection] = (c.picks[selection] ?? 0) + r._count._all
    }
    for (const [id, c] of Object.entries(contests)) if (c.total < COMMUNITY_MIN) delete contests[id]

    return NextResponse.json({ guides, community: { sharers, minimum: COMMUNITY_MIN, contests } })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
