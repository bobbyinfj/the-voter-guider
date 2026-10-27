// Published voter guides people can compare their picks with (party slates, newspaper
// editorial boards and columnists, the League of Women Voters, advocacy guides). Built by
// data/research/comparison-builders/build.py into data/comparisons/<election slug>.json and
// seeded as read-only template guides. Every pick carries its own source and a verbatim quote
// from it; the build refuses a quote that isn't on the saved page.

export type ComparisonKind = 'party' | 'editorial' | 'columnist' | 'lwv' | 'advocacy'
export type Lean = 'left' | 'right'

export interface ComparisonPick {
  ballot: string // Ballot id: "<office id>-race" or the measure id
  pick: string // candidate name exactly as in the bundle, or YES / NO
  source: string // the page this pick was published on
  quote: string // verbatim text from that page showing the pick
}

export interface ComparisonGuideData {
  id: string
  name: string // publisher, e.g. "The Seattle Times editorial board"
  kind: ComparisonKind
  // Party and advocacy guides come in left/right pairs so neither side appears alone
  lean?: Lean
  url: string // the guide's main page
  retrieved: string // YYYY-MM-DD
  about: string // one line: who they are and what this covers
  picks: ComparisonPick[]
}

export interface ComparisonFile {
  electionSlug: string
  guides: ComparisonGuideData[]
}

export const KIND_LABELS: Record<ComparisonKind, string> = {
  party: 'Party endorsements',
  editorial: 'Newspaper editorial boards',
  columnist: 'Newspaper columnists',
  lwv: 'League of Women Voters',
  advocacy: 'Advocacy guides',
}

// Stored on Guide.metadata.comparison for template guides
export interface ComparisonMeta {
  kind: ComparisonKind
  lean?: Lean
  url: string
  retrieved: string
  about: string
}

const KINDS = new Set(Object.keys(KIND_LABELS))
const HTTP = /^https?:\/\/[^\s]+$/

// Problems with a comparison file, checked against the election's ballot items
export function comparisonProblems(
  file: ComparisonFile,
  ballots: Map<string, { type: string; options: string[] }>,
): string[] {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const g of file.guides) {
    const at = `${file.electionSlug}/${g.id}`
    if (ids.has(g.id)) problems.push(`${at}: duplicate id`)
    ids.add(g.id)
    if (!KINDS.has(g.kind)) problems.push(`${at}: unknown kind ${g.kind}`)
    if (!HTTP.test(g.url)) problems.push(`${at}: url must be http(s)`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(g.retrieved)) problems.push(`${at}: retrieved must be YYYY-MM-DD`)
    if ((g.kind === 'party' || g.kind === 'advocacy') && g.lean !== 'left' && g.lean !== 'right')
      problems.push(`${at}: ${g.kind} guides need lean left/right`)
    const seen = new Set<string>()
    for (const p of g.picks) {
      const ballot = ballots.get(p.ballot)
      if (!ballot) problems.push(`${at}: no ballot item ${p.ballot}`)
      else if (ballot.type === 'candidate' ? !ballot.options.includes(p.pick) : p.pick !== 'YES' && p.pick !== 'NO')
        problems.push(`${at}: ${p.ballot}: ${JSON.stringify(p.pick)} isn't a choice on the ballot`)
      if (seen.has(p.ballot)) problems.push(`${at}: two picks for ${p.ballot}`)
      seen.add(p.ballot)
      if (!HTTP.test(p.source)) problems.push(`${at}: ${p.ballot}: source must be http(s)`)
      if (!p.quote?.trim()) problems.push(`${at}: ${p.ballot}: missing quote`)
    }
  }
  // Fairness: a party or advocacy guide only with its counterpart from the other side
  for (const kind of ['party', 'advocacy'] as const) {
    const leans = new Set(file.guides.filter((g) => g.kind === kind).map((g) => g.lean))
    if (leans.size === 1) problems.push(`${file.electionSlug}: ${kind} guides from only one side (${[...leans][0]})`)
  }
  return problems
}
