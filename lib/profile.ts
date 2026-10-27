// Candidate extras (Candidate.profile), built by data/research/enrichment-builders. Every
// piece is copied from a named source; the UI shows it as a Voter Guider extra.
import type { BarRecord, EthicsRecord, FactCheckClaim, FactCheckRecord } from './scorecard'

export type EndorserKind = 'org' | 'official' | 'media' | 'person'

export interface Endorser {
  name: string
  kind: EndorserKind
}

// Who made a video, from outside questions to the candidate's own message (VIDEO_ORIGINS)
export type VideoOrigin = 'independent' | 'civic' | 'viewpoint' | 'government' | 'campaign'

export interface CandidateVideo {
  youtubeId: string
  kind: 'interview' | 'statement' | 'debate' | 'forum' | 'explainer' | 'meeting'
  origin: VideoOrigin
  title: string
  channel: string
  published: string
  durationSec?: number
  // Who organized it, when that isn't the channel (e.g. a League forum on a city channel)
  host?: string
  // A part of a long forum or meeting
  startSec?: number
  endSec?: number
  // Where we found it, when that's more than YouTube: a campaign page, a meeting transcript
  sourceUrl?: string
  sourceLabel?: string
  // Race videos: who is in it, and where each first speaks
  participants?: { id: string; startSec?: number }[]
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
  claims?: FactCheckClaim[]
  bar?: BarRecord
  ethics?: EthicsRecord
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
  claims: FactCheckClaim[]
  bar: BarRecord | null
  ethics: EthicsRecord | null
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
    video: leadVideo(p.videos ?? []),
    endorsers: ordered.slice(0, maxEndorsers),
    endorserTotal: ordered.length + (p.endorsements?.individuals ?? 0),
    endorsementsUrl: p.endorsements?.source.url ?? null,
    guide: p.guide ?? null,
    factCheck: p.factCheck ?? null,
    claims: p.claims ?? [],
    bar: p.bar ?? null,
    ethics: p.ethics ?? null,
    videos: p.videos ?? [],
  }
}

export const VIDEO_KIND_LABELS: Record<CandidateVideo['kind'], string> = {
  interview: 'Interview',
  statement: "Video voters' guide statement",
  debate: 'Debate',
  forum: 'Candidate forum',
  explainer: 'Explainer',
  meeting: 'At a public meeting',
}

// Shown beside every video: who made it and what that means for what you're seeing.
// Ordered from questions someone else asks to the candidate's own message.
export const VIDEO_ORIGINS: Record<VideoOrigin, { label: string; about: string }> = {
  independent: {
    label: 'Independent',
    about:
      'Made by a news outlet or a nonpartisan series such as the League of Women Voters. They choose the questions and ask every candidate the same ones. Outlets still decide what to ask, so note who made it.',
  },
  civic: {
    label: 'Civic forum',
    about:
      'Hosted by a community group (a chamber of commerce, neighborhood council or PTA) that invited every candidate in the race. The host picks the questions, and a forum audience can lean one way.',
  },
  viewpoint: {
    label: 'Viewpoint outlet',
    about:
      "Made by a commentator or outlet with a point of view (a podcast host, an opinion site, a faith program). They pick who to invite and what to ask, often only one candidate in the race gets on, and the questions can be friendly or hostile depending on the host.",
  },
  government: {
    label: 'Government',
    about:
      "Made by a government. Public meetings are recorded unedited; that footage only exists for people who already hold office or spoke at a meeting, so challengers often have none, and we pick the part by a fixed rule (their longest times speaking at recent meetings), not by what they said. A government's presentation on a measure it put on the ballot comes from a side that wants it to pass.",
  },
  campaign: {
    label: 'From the campaign',
    about:
      "Made or posted by the candidate's own campaign. It's how they choose to present themselves: nobody else asked the questions or checked the claims.",
  },
}
export const ORIGIN_ORDER: VideoOrigin[] = ['independent', 'civic', 'viewpoint', 'government', 'campaign']

// Most independent first, interviews ahead of the rest within each
export function sortVideos(videos: CandidateVideo[]): CandidateVideo[] {
  const rank = (v: CandidateVideo) => Math.max(0, ORIGIN_ORDER.indexOf(v.origin)) * 2 + (v.kind === 'interview' ? 0 : 1)
  return [...videos].sort((a, b) => rank(a) - rank(b))
}

export function leadVideo(videos: CandidateVideo[]): CandidateVideo | null {
  return sortVideos(videos)[0] ?? null
}

// Extras for a whole race or measure (debates and forums with several candidates, explainers,
// links), kept in the ballot's metadata.extras by the seed
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
  if (m < 1) return `${sec} sec`
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`
}

// Bite / snack / meal for videos, since most people spend under an hour on their whole ballot: a
// bite is a quick look (up to 2 min), a snack a short video (up to 10), a meal anything longer, or
// a part of a long forum whose end we don't know. Only bites and snacks play up front.
export type VideoTier = 'bite' | 'snack' | 'meal'
export const BITE_SEC = 120
export const SNACK_SEC = 600

export interface VideoPick {
  video: CandidateVideo
  // Where their part of a forum starts, when it's not the video's own clip
  startSec?: number
}

// How long it asks you to watch: a clip's own length, else the whole video's (unknown for a part of
// a forum we only know the start of)
export function watchLength({ video, startSec }: VideoPick): number | undefined {
  const start = startSec ?? video.startSec
  if (start !== undefined && video.endSec !== undefined && startSec === undefined) return video.endSec - start
  if (start !== undefined) return undefined
  return video.durationSec
}

export function videoTier(pick: VideoPick): VideoTier {
  const len = watchLength(pick)
  return len === undefined || len > SNACK_SEC ? 'meal' : len > BITE_SEC ? 'snack' : 'bite'
}

// Which rung plays up front: the most independent bite or snack (a 1-minute meeting clip shouldn't
// beat a 10-minute interview), the shorter one on a tie. -1 when there are only meals.
export function leadRung(ladder: (VideoPick & { tier: VideoTier })[]): number {
  const rank = (p: VideoPick) => Math.max(0, ORIGIN_ORDER.indexOf(p.video.origin))
  let best = -1
  ladder.forEach((p, i) => {
    if (p.tier !== 'meal' && (best < 0 || rank(p) < rank(ladder[best]))) best = i
  })
  return best
}

// The best video of each length, shortest first (a bite leads into a snack, a snack into a meal).
// Picks come in preference order (most independent first) and keep it within a tier.
export function videoLadder(picks: VideoPick[]): (VideoPick & { tier: VideoTier })[] {
  const tiers: VideoTier[] = ['bite', 'snack', 'meal']
  return tiers.flatMap((tier) => {
    const pick = picks.find((p) => videoTier(p) === tier)
    return pick ? [{ ...pick, tier }] : []
  })
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
