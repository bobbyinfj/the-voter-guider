// The Expanded view's scorecard: three columns per candidate (flags, fact-check record, badges),
// each worked out the same way for every candidate in a race from sourced data, and each
// saying where it's from. Explained to voters at /how-we-score.
import type { NewsGuide, ProfileSnippet } from './profile'

// PolitiFact's Truth-O-Meter counts for one person (enrichment-builders/politifact.py), copied
// from their PolitiFact page. All of their rulings, not only this campaign's.
export interface FactCheckRecord {
  publisher: 'PolitiFact'
  url: string
  retrieved: string
  counts: Record<Ruling, number>
  // PolitiFact's one-line description of them, and the year of their newest ruling
  bio?: string
  latestYear?: number
}

export const RULINGS = ['true', 'mostly-true', 'half-true', 'mostly-false', 'false', 'pants-fire'] as const
export type Ruling = (typeof RULINGS)[number]
export const RULING_LABELS: Record<Ruling, string> = {
  true: 'True',
  'mostly-true': 'Mostly True',
  'half-true': 'Half True',
  'mostly-false': 'Mostly False',
  false: 'False',
  'pants-fire': 'Pants on Fire',
}
// What counts toward the 💩 share
export const FALSEISH: Ruling[] = ['mostly-false', 'false', 'pants-fire']
// Below this many rulings a share says more about which claims got checked than about the person
export const FACTCHECK_MIN = 5

export interface FactCheckScore {
  total: number
  falseish: number
  // Rounded percent, or null when there are too few rulings to give one
  pct: number | null
}

export function factCheckScore(fc: FactCheckRecord | null | undefined): FactCheckScore {
  if (!fc) return { total: 0, falseish: 0, pct: null }
  const total = RULINGS.reduce((n, r) => n + (fc.counts[r] ?? 0), 0)
  const falseish = FALSEISH.reduce((n, r) => n + (fc.counts[r] ?? 0), 0)
  return { total, falseish, pct: total >= FACTCHECK_MIN ? Math.round((falseish / total) * 100) : null }
}

// A claim a news fact-check examined, and its verdict, both verbatim from the article
// (enrichment-builders/<state>-factchecks.json). Never turned into a rating or counted in the 💩 share.
export interface FactCheckClaim {
  publisher: string
  title: string
  url: string
  retrieved: string
  claim: string
  verdict: string
}

// The State Bar of California's public record for a candidate who is a lawyer
// (enrichment-builders/calbar.py). `unmatched`: covered by the check, but no single profile matched.
export interface BarRecord {
  publisher: 'State Bar of California'
  unmatched?: boolean
  url?: string
  retrieved?: string
  status?: string
  admitted?: string
  discipline?: string[]
  shownName?: string
}

// Fines from the Fair Political Practices Commission's monthly enforcement releases
// (enrichment-builders/fppc.py): everyone on the ballot was searched over the same releases
export interface EthicsRecord {
  publisher: 'Fair Political Practices Commission'
  from: string
  to: string
  releases: number
  fines: { respondent: string; case: string; fine: number | null; summary: string | null; shared: boolean; url: string; month: string; retrieved: string }[]
}

// A share is only shown in a race when every candidate in it has enough rulings: one
// candidate's 💩 % next to another's blank would read as a comparison it isn't
export function raceHasFactChecks(people: { profile?: ProfileSnippet | null }[]): boolean {
  return people.length > 1 && people.every((c) => factCheckScore(c.profile?.factCheck).pct !== null)
}

// A flag is a fact from a source, found by a rule we apply to everyone a source covers.
// Red: a judgment against the candidate by a body whose job is judging that. Yellow: something
// worth asking about.
export interface Flag {
  level: 'red' | 'yellow'
  rule: FlagRule
  // Short, for the card; `detail` is the source's own words, shown under the card
  text: string
  detail?: string
  source: { label: string; url: string; retrieved?: string }
}

export type FlagRule = 'bar-discipline' | 'bar-not-qualified' | 'ethics-fine' | 'skipped-news-survey'
// `check`: how the card names the check when it found nothing
export const FLAG_RULES: Record<FlagRule, { level: Flag['level']; name: string; check: string; covers: string }> = {
  'bar-discipline': {
    level: 'red',
    name: 'Public discipline on their State Bar record',
    check: 'State Bar record',
    covers: 'candidates who are lawyers: everyone running for judge or Attorney General, and anyone whose ballot designation says they practice law (California)',
  },
  'ethics-fine': {
    level: 'yellow',
    name: "Fined by the state's ethics and campaign-finance commission",
    check: 'state ethics fines',
    covers: "every candidate, searched by name in the Fair Political Practices Commission's monthly enforcement releases since January 2021 (California)",
  },
  'bar-not-qualified': {
    level: 'red',
    name: 'Rated "Not Qualified" by the county bar association',
    check: 'bar association rating',
    covers: 'judicial candidates the Los Angeles County Bar Association rates',
  },
  'skipped-news-survey': {
    level: 'yellow',
    name: "Didn't answer a news outlet's candidate survey",
    check: 'answered the LAist survey',
    covers: 'candidates LAist sent its survey to (LACCD trustees)',
  },
}

function guideLabel(g: NewsGuide): string {
  return g.source.byline && g.source.byline !== g.source.publisher ? `${g.source.byline} via ${g.source.publisher}` : g.source.publisher
}

// Which rules looked at this candidate (so "no flags" can say what was checked), and what they found
export function flagsFor(p: ProfileSnippet | null | undefined): { checked: FlagRule[]; flags: Flag[] } {
  const checked: FlagRule[] = []
  const flags: Flag[] = []
  const g = p?.guide
  const bar = p?.bar
  if (bar) {
    checked.push('bar-discipline')
    if (bar.discipline?.length && bar.url)
      flags.push({
        level: 'red',
        rule: 'bar-discipline',
        text: `State Bar record: ${bar.discipline.join('; ')}`,
        source: { label: bar.publisher, url: bar.url, retrieved: bar.retrieved },
      })
  }
  const ethics = p?.ethics
  if (ethics) {
    checked.push('ethics-fine')
    for (const f of ethics.fines)
      flags.push({
        level: 'yellow',
        rule: 'ethics-fine',
        text: `Ethics fine${f.fine ? `: $${f.fine.toLocaleString('en-US')}` : ''}${f.shared ? ', shared with others in the case' : ''}`,
        detail: `FPPC case ${f.case}, against ${f.respondent}${f.summary ? `: “${f.summary}”` : ''}`,
        source: { label: `FPPC, ${f.month}`, url: f.url, retrieved: f.retrieved },
      })
  }
  if (g?.rating) {
    checked.push('bar-not-qualified')
    if (/^not qualified$/i.test(g.rating.value))
      flags.push({
        level: 'red',
        rule: 'bar-not-qualified',
        text: `Rated "${g.rating.value}"`,
        source: { label: g.rating.by, url: g.rating.source.url, retrieved: g.rating.source.retrieved },
      })
  }
  if (g && (g.answers?.length || /did not respond/i.test(g.note ?? ''))) {
    checked.push('skipped-news-survey')
    if (/did not respond/i.test(g.note ?? ''))
      flags.push({
        level: 'yellow',
        rule: 'skipped-news-survey',
        text: `Didn't answer ${g.source.publisher}'s candidate survey`,
        source: { label: guideLabel(g), url: g.source.url, retrieved: g.source.retrieved },
      })
  }
  return { checked, flags }
}

// Voter guides and parties that recommend this option, and bar ratings: each one links to where
// it was published
export interface Badge {
  by: string
  kind: 'party' | 'editorial' | 'lwv' | 'advocacy' | 'rating' | 'news'
  lean?: 'left' | 'right' | null
  label: string
  url: string | null
  quote?: string | null
}

// ballot id → selection (candidate name or YES/NO) → badges
export type BadgeMap = Record<string, Record<string, Badge[]>>

// Published guides' picks (comparison template guides), turned into badges on what they pick
export function badgesFrom(
  guides: { title: string; metadata: unknown; choices: { ballotId: string; selection: string; sourceUrl: string | null; notes: string | null }[] }[],
): BadgeMap {
  const map: BadgeMap = {}
  for (const g of guides) {
    const meta = (g.metadata as { comparison?: { kind?: Badge['kind']; lean?: Badge['lean']; url?: string } } | null)?.comparison
    if (!meta?.kind) continue
    for (const c of g.choices) {
      const list = ((map[c.ballotId] ??= {})[c.selection] ??= [])
      list.push({ by: g.title, kind: meta.kind, lean: meta.lean ?? null, label: g.title, url: c.sourceUrl ?? meta.url ?? null, quote: c.notes })
    }
  }
  return map
}
