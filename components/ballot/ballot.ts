// Shared types and helpers for the ballot-replica guide view
import type { ProfileSnippet } from '@/lib/profile'

export interface BallotCandidate {
  id: string
  name: string
  party: string | null
  incumbent: boolean
  shortBio?: string | null
  website?: string | null
  profile?: ProfileSnippet | null
}

export interface BallotItem {
  id: string
  number?: string | null
  title: string
  description?: string | null
  type: string
  options?: unknown
  metadata?: unknown
  office?: { id: string; district?: string | null; candidates: BallotCandidate[] } | null
}

// Leaning toward a pick, or settled on it
export type ChoiceStatus = 'tentative' | 'decided'

export interface ChoiceValue {
  selection: string
  notes?: string
  status?: ChoiceStatus
}

export interface BallotSection {
  key: string
  label: string
  subsection?: string
  notice?: string
  // Same printed heading as the section before it (only the subheading changes)
  continued?: boolean
  // The ballot prints no section bar here (LA County: the jurisdiction is in each heading)
  noBar?: boolean
  items: BallotItem[]
}

// How the county's official sample ballot prints this contest (see data/research/sample-ballots)
export interface PrintedLayout {
  source: string
  // Set when the source isn't a printed sample-ballot PDF (LA County's Interactive Sample Ballot)
  sourceName?: string
  // This contest's own file in the source, when it has one
  contestSource?: string
  style: { party: 'below' | 'right'; responses: 'stacked' | 'inline' }
  order: number
  section: string
  subsection?: string
  heading: string[]
  instructions: string[]
  notice?: string
  // designation: the ballot designation printed under the name (California)
  candidates?: { name: string; label: string; party?: string; designation?: string }[]
  writeIn?: boolean
  question?: string
  responses?: string[]
  group?: string
  table?: { caption: string | null; columns: string[]; rows: string[][] }
  note?: string
}

// Selection values the choices API accepts besides a candidate name / YES / NO
export const WRITE_IN = 'WRITE-IN:'
export const ABSTAIN = 'ABSTAIN'
// "No clue yet": you've looked at the contest and don't know. Still counts as to go.
export const UNSURE = 'UNSURE'
// A real pick (a candidate, a write-in, YES/NO), not blank or no-clue
export const isPick = (selection?: string) => !!selection && selection !== ABSTAIN && selection !== UNSURE
// A measure's printed responses map, in order, to these stored values
export const MEASURE_VALUES = ['YES', 'NO'] as const

const LEVEL_ORDER: Record<string, number> = { federal: 0, state: 1, county: 2, city: 3, school: 4, special: 5, district: 6 }
const LEVEL_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
  county: 'County',
  city: 'City',
  school: 'School',
  special: 'Special district',
  district: 'District',
}

function meta(item: BallotItem): Record<string, unknown> {
  return item.metadata && typeof item.metadata === 'object' ? (item.metadata as Record<string, unknown>) : {}
}

export function isMeasure(item: BallotItem): boolean {
  return item.type !== 'candidate'
}

export function levelOf(item: BallotItem): string {
  const level = meta(item).level
  return typeof level === 'string' ? level : 'state'
}

export function layoutOf(item: BallotItem): PrintedLayout | null {
  const b = meta(item).ballot
  return b && typeof b === 'object' && typeof (b as PrintedLayout).order === 'number' ? (b as PrintedLayout) : null
}

export function optionList(options: unknown): string[] {
  return Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : []
}

// Printed ballot order when the election has a sample-ballot layout; otherwise races in
// sortOrder, then measures grouped statewide → county → city → district
export function orderForBallot<T extends BallotItem>(items: T[]): T[] {
  const sortOrder = (i: BallotItem) => (typeof meta(i).sortOrder === 'number' ? (meta(i).sortOrder as number) : 100)
  const fallback = (a: T, b: T) =>
    Number(isMeasure(a)) - Number(isMeasure(b)) ||
    (isMeasure(a)
      ? (LEVEL_ORDER[levelOf(a)] ?? 9) - (LEVEL_ORDER[levelOf(b)] ?? 9) ||
        (a.number ?? '').localeCompare(b.number ?? '', undefined, { numeric: true })
      : sortOrder(a) - sortOrder(b))
  return [...items].sort((a, b) => {
    const la = layoutOf(a)
    const lb = layoutOf(b)
    if (la && lb) return la.order - lb.order
    if (la || lb) return la ? -1 : 1
    return fallback(a, b)
  })
}

// "the county's official sample ballot", or what the layout was actually copied from
export function layoutSourceName(items: BallotItem[]): string {
  return (items[0] && layoutOf(items[0])?.sourceName) || "the county's official sample ballot"
}

export function hasPrintedLayout(items: BallotItem[]): boolean {
  return items.length > 0 && items.every((i) => layoutOf(i))
}

// Groups already-ordered items into sections: as printed (consecutive section/subsection
// headings) when there's a layout, otherwise races by level then measures by level
export function groupSections(items: BallotItem[]): BallotSection[] {
  const sections: BallotSection[] = []
  for (const item of items) {
    const printed = layoutOf(item)
    const level = levelOf(item)
    const key = printed
      ? `${printed.section}|${printed.subsection ?? ''}`
      : `${isMeasure(item) ? 'measure' : 'race'}:${level}`
    const last = sections[sections.length - 1]
    if (last && last.key.split('#')[0] === key) {
      last.items.push(item)
      continue
    }
    const name = LEVEL_LABELS[level] ?? level
    sections.push({
      key: `${key}#${sections.length}`,
      label: printed ? printed.section || 'Contests' : isMeasure(item) ? `${name} measures` : `${name} offices`,
      noBar: printed ? !printed.section : undefined,
      subsection: printed?.subsection,
      continued: !!printed && last?.label === printed.section && !!printed.subsection,
      items: [item],
    })
  }
  // A notice (e.g. the partisan-preference statement) prints once, before the first
  // contest it applies to
  const shown = new Set<string>()
  for (const section of sections) {
    const notice = section.items.map((i) => layoutOf(i)?.notice).find((n) => n && !shown.has(n))
    if (notice) {
      section.notice = notice
      shown.add(notice)
    }
  }
  return sections
}

// Consecutive items printed under one heading (judicial retention questions)
export function groupRuns(items: BallotItem[]): BallotItem[][] {
  const runs: BallotItem[][] = []
  for (const item of items) {
    const group = layoutOf(item)?.group
    const last = runs[runs.length - 1]
    if (group && last && layoutOf(last[0])?.group === group) last.push(item)
    else runs.push([item])
  }
  return runs
}

export function contestLabel(item: BallotItem): string {
  const printed = layoutOf(item)
  if (printed?.group) return item.title
  if (printed) return printed.heading.join(' ')
  return item.number ? `${item.number} — ${item.title}` : item.title
}

// Short name for the contest navigator. LA County prints a long all-caps jurisdiction line
// first ("CITY OF MONTEREY PARK GENERAL MUNICIPAL ELECTION / City Clerk"), which would hide the
// office, so those use our plain title ("Monterey Park City Clerk", "Measure AAA: …")
export function navLabel(item: BallotItem): string {
  const printed = layoutOf(item)
  const first = printed?.heading[0] ?? ''
  if (printed && !printed.group && printed.heading.length > 1 && /^[A-Z0-9 ,.'&-]{20,}$/.test(first)) {
    return item.number ? `${item.number}: ${item.title}` : item.title
  }
  return contestLabel(item)
}

// Printed text for a stored selection: "YES/FOR", the ticket "A / B", "Write-in: X"
export function choiceLabel(selection: string, item?: BallotItem): string {
  if (selection === ABSTAIN) return 'Left blank'
  if (selection === UNSURE) return 'No clue yet'
  if (selection.startsWith(WRITE_IN)) return `Write-in: ${selection.slice(WRITE_IN.length)}`
  const printed = item ? layoutOf(item) : null
  const i = MEASURE_VALUES.indexOf(selection as (typeof MEASURE_VALUES)[number])
  if (i >= 0) return printed?.responses?.[i] ?? (selection === 'YES' ? 'Yes' : 'No')
  return printed?.candidates?.find((c) => c.name === selection)?.label ?? selection
}

export function contestDomId(item: BallotItem): string {
  return `contest-${item.id}`
}

// Candidates in the order the ballot prints them (the race's printed layout, else its
// options list); anyone not found keeps their place at the end
export function inPrintedOrder<T extends { name: string }>(
  people: T[],
  race: { metadata?: unknown; options?: unknown } | null | undefined,
): T[] {
  if (!race) return people
  const printed = layoutOf({ id: '', title: '', type: 'candidate', ...race })
  const names = printed?.candidates?.map((c) => c.name) ?? optionList(race.options)
  const rank = (p: T) => (names.includes(p.name) ? names.indexOf(p.name) : names.length)
  return [...people].sort((a, b) => rank(a) - rank(b))
}
