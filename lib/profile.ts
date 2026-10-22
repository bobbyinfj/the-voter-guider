// Candidate extras (Candidate.profile), built by data/research/enrichment-builders. Every
// piece is copied from a named source; the UI shows it as a Voter Guider extra.
import type { FactCheckRecord } from './scorecard'

export type EndorserKind = 'org' | 'official' | 'media' | 'person'

export interface Endorser {
  name: string
  kind: EndorserKind
}

export interface CandidateVideo {
  youtubeId: string
  kind: 'interview' | 'statement' | 'debate' | 'forum'
  title: string
  channel: string
  published: string
  durationSec?: number
}

// What a news organization's voter guide says about a candidate (data/research/enrichment-builders/
// laist.py): copied from the guide, with the bar association's rating for judges
export interface NewsGuide {
  source: { publisher: string; byline: string; url: string; retrieved: string }
  about?: string
  // e.g. "didn't respond to the survey"
  note?: string
  keyEndorsements?: string[]
  endorsementsLine?: string
  website?: string
  endorsementsUrl?: string
  stateBarUrl?: string
  rating?: { by: string; value: string; source: { title: string; url: string; retrieved: string } }
  answers?: { q: string; a: string }[]
}

export interface CandidateProfile {
  summary?: {
    source: { title: string; url: string; page?: number }
    fields: { label: string; text: string }[]
    statement: string | null
  }
  pamphletEndorsements?: string
  website?: string
  videos?: CandidateVideo[]
  endorsements?: {
    source: { url: string; retrieved: string }
    list: Endorser[]
    individuals?: number
  }
  guide?: NewsGuide
  factCheck?: FactCheckRecord
}

// What ballot views get: enough for a "snack" without shipping every endorser to the browser
export interface ProfileSnippet {
  headline: { label: string; text: string } | null
  summarySource: { title: string; url: string; page?: number } | null
  video: CandidateVideo | null
  endorsers: Endorser[]
  endorserTotal: number
  endorsementsUrl: string | null
  guide: NewsGuide | null
  factCheck: FactCheckRecord | null
  // Every video of them, for the scorecard's video column (`video` is the one to lead with)
  videos: CandidateVideo[]
}

export const ENDORSER_KIND_LABELS: Record<EndorserKind, string> = {
  org: 'Organizations',
  media: 'News outlets and voter guides',
  official: 'Elected and appointed officials',
  person: 'Community leaders',
}

export function asProfile(value: unknown): CandidateProfile | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as CandidateProfile) : null
}

const KIND_ORDER: EndorserKind[] = ['media', 'org', 'official', 'person']

// Organizations and news outlets first: they're the ones most voters recognize
export function endorsersByKind(list: Endorser[]): { kind: EndorserKind; items: Endorser[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, items: list.filter((e) => e.kind === kind) })).filter((g) => g.items.length)
}

export function snippet(value: unknown, maxEndorsers = 8): ProfileSnippet | null {
  const p = asProfile(value)
  if (!p) return null
  const ordered = endorsersByKind(p.endorsements?.list ?? []).flatMap((g) => g.items)
  return {
    headline:
      p.summary?.fields[0] ??
      (p.summary?.statement && p.summary.statement !== 'No candidate statement.'
        ? { label: 'In their statement', text: p.summary.statement }
        : null),
    summarySource: p.summary?.source ?? null,
    video: p.videos?.find((v) => v.kind === 'interview') ?? p.videos?.[0] ?? null,
    endorsers: ordered.slice(0, maxEndorsers),
    endorserTotal: ordered.length + (p.endorsements?.individuals ?? 0),
    endorsementsUrl: p.endorsements?.source.url ?? null,
    guide: p.guide ?? null,
    factCheck: p.factCheck ?? null,
    videos: p.videos ?? [],
  }
}

export const VIDEO_KIND_LABELS: Record<CandidateVideo['kind'], string> = {
  interview: 'Interview',
  statement: "Video voters' guide statement",
  debate: 'Debate',
  forum: 'Candidate forum',
}

// Extras for a whole race (debates and forums with several candidates, links), kept in the
// race ballot's metadata.extras by the seed
export interface RaceExtras {
  videos?: CandidateVideo[]
  links?: { label: string; url: string }[]
}

export function raceExtrasOf(metadata: unknown): RaceExtras | null {
  const extras = metadata && typeof metadata === 'object' ? (metadata as { extras?: unknown }).extras : null
  return extras && typeof extras === 'object' ? (extras as RaceExtras) : null
}

export function formatDuration(sec?: number): string | null {
  if (!sec) return null
  const m = Math.round(sec / 60)
  return m < 1 ? `${sec} sec` : `${m} min`
}

export function formatRetrieved(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export function isHttpUrl(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\/[^\s"'<>]+$/i.test(url)
}

// Swap full candidate profiles for snippets before sending a ballot to the browser
export function snippetCandidates<T extends { profile?: unknown }>(candidates: T[]): (Omit<T, 'profile'> & { profile: ProfileSnippet | null })[] {
  return candidates.map((c) => ({ ...c, profile: snippet(c.profile) }))
}

// Circle-badge text for an endorser: initials, an acronym, or a district number
const SKIP = new Set(['of', 'the', 'and', 'for', 'in', 'at', 'to', '&', 'a', 'an', 'on', 'by'])
const TITLES =
  /^(?:(?:former|fmr\.?|retired|ret\.?|u\.?s\.?|wa|washington|state|chief|associate|acting|presiding|deputy|lt\.?|lieutenant|king|county|co\.|city|seattle|the)\s+)*(?:rep\.?|representative|sen\.?|senator|congresswoman|congressman|gov\.?|governor|mayor|judge|justice|commissioner|councilmember|council member|executive|attorney general|treasurer|auditor|superintendent|speaker|secretary of state|insurance commissioner|director|dr\.?|hon\.?)\s+/i

export function initials(e: Endorser): string {
  const name = e.name.replace(/\(.*?\)/g, '').replace(/(,| [–—-] ).*$/, '').trim()
  const words = (e.kind === 'official' || e.kind === 'person' ? name.replace(TITLES, '') : name)
    .split(/\s+/)
    .filter((w) => w && !SKIP.has(w.toLowerCase()))
  if (!words.length) return '?'
  // "32nd District Democrats" → "32"
  const num = words.find((w) => /^\d+(st|nd|rd|th)?$/i.test(w))
  if (num && e.kind !== 'person' && (/^\d/.test(words[0]) || /\d(st|nd|rd|th)$/i.test(num))) return num.match(/^\d+/)![0].slice(0, 3)
  if (e.kind === 'official' || e.kind === 'person') {
    const first = words[0][0]
    const last = words[words.length - 1][0]
    return (words.length > 1 ? first + last : first).toUpperCase()
  }
  // Acronyms stay as written ("UFCW 3000" → "UFCW"); one word gets two letters ("The Stranger" → "ST")
  if (/^[A-Z0-9]{2,5}$/.test(words[0])) return words[0].slice(0, 4)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

// "LAist" or "CalMatters, republished by LAist": who wrote the guide and where it ran
export function guideCredit(g: NewsGuide): string {
  return g.source.byline && g.source.byline !== g.source.publisher ? `${g.source.byline} via ${g.source.publisher}` : g.source.publisher
}
