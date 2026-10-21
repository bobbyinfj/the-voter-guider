// Shared types and helpers for the ballot-style guide view

export interface BallotCandidate {
  id: string
  name: string
  party: string | null
  incumbent: boolean
}

export interface BallotItem {
  id: string
  number?: string | null
  title: string
  description?: string | null
  type: string
  options?: unknown
  metadata?: unknown
  office?: { id: string; candidates: BallotCandidate[] } | null
}

export interface ChoiceValue {
  selection: string
  notes?: string
}

export interface BallotSection {
  key: string
  label: string
  items: BallotItem[]
}

// Selection values the choices API accepts besides a candidate name / YES / NO
export const WRITE_IN = 'WRITE-IN:'
export const ABSTAIN = 'ABSTAIN'

const LEVEL_LABELS: Record<string, string> = {
  federal: 'Federal',
  state: 'State',
  county: 'County',
  city: 'City',
  school: 'School',
  special: 'Special district',
  district: 'District',
}

export function isMeasure(item: BallotItem): boolean {
  return item.type !== 'candidate'
}

export function levelOf(item: BallotItem): string {
  const m = item.metadata
  const level = m && typeof m === 'object' ? (m as { level?: unknown }).level : undefined
  return typeof level === 'string' ? level : 'state'
}

export function optionList(options: unknown): string[] {
  return Array.isArray(options) ? options.filter((o): o is string => typeof o === 'string') : []
}

// Groups already-ordered items into ballot sections (races by level, then measures by level)
export function groupSections(items: BallotItem[]): BallotSection[] {
  const sections: BallotSection[] = []
  for (const item of items) {
    const level = levelOf(item)
    const key = `${isMeasure(item) ? 'measure' : 'race'}:${level}`
    let section = sections.find((s) => s.key === key)
    if (!section) {
      const name = LEVEL_LABELS[level] ?? level
      section = { key, label: isMeasure(item) ? `${name} measures` : `${name} offices`, items: [] }
      sections.push(section)
    }
    section.items.push(item)
  }
  return sections
}

export function contestLabel(item: BallotItem): string {
  return item.number ? `${item.number} — ${item.title}` : item.title
}

export function choiceLabel(selection: string): string {
  if (selection === ABSTAIN) return 'Left blank'
  if (selection === 'YES') return 'Yes'
  if (selection === 'NO') return 'No'
  if (selection.startsWith(WRITE_IN)) return `Write-in: ${selection.slice(WRITE_IN.length)}`
  return selection
}

export function contestDomId(item: BallotItem): string {
  return `contest-${item.id}`
}
