'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Flag as FlagIcon } from 'lucide-react'
import VideoFacade from '@/components/candidate/VideoFacade'
import VideoCarousel from '@/components/candidate/VideoCarousel'
import { EndorserStrip } from '@/components/candidate/Endorsements'
import {
  formatDuration,
  isHttpUrl,
  raceExtrasOf,
  sortVideos,
  leadRung,
  shortestFirst,
  videoLadder,
  videoTier,
  watchLength,
  type CandidateVideo,
  type VideoPick,
  type VideoTier,
} from '@/lib/profile'
import {
  FLAG_RULES,
  RULING_LABELS,
  factCheckScore,
  flagsFor,
  raceHasAnyFactChecks,
  raceHasFactChecks,
  type Badge,
  type FactCheckRecord,
} from '@/lib/scorecard'
import type { BallotCandidate, BallotItem } from './ballot'

// The Expanded view's scorecard beside each candidate's oval: a video to watch them speak, then
// three columns worked out the same way for everyone in the race (rules at /how-we-score).

// Each column's title links to its rules on /how-we-score
function Cell({ title, how, children }: { title: React.ReactNode; how: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5">
      <p className="mb-0.5 flex items-center justify-between gap-1 text-[0.625rem] font-bold uppercase tracking-wider text-sky-800">
        <span>{title}</span>
        <Link href={`/how-we-score#${how}`} className="font-semibold normal-case tracking-normal text-blue-700 hover:underline" title="How this column is worked out">
          how?
        </Link>
      </p>
      {children}
    </div>
  )
}

function Src({ href, children }: { href: string | null | undefined; children: React.ReactNode }) {
  if (!isHttpUrl(href)) return <>{children}</>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">
      {children}
      <ExternalLink className="ml-0.5 inline h-2.5 w-2.5 align-baseline" />
    </a>
  )
}

// Videos every candidate in the race appears in (debates), shown once above the race
export function sharedVideos(race: BallotItem): CandidateVideo[] {
  const people = race.office?.candidates ?? []
  const all = [...(raceExtrasOf(race.metadata)?.videos ?? [])]
  if (people.length > 1) {
    for (const v of people[0].profile?.videos ?? [])
      if (people.every((c) => c.profile?.videos.some((w) => w.youtubeId === v.youtubeId))) all.push(v)
  }
  return all.filter((v, i) => all.findIndex((w) => w.youtubeId === v.youtubeId) === i)
}

// Above the candidates: debates with everyone in them, shortest first. Thumbnails only until played.
// With only long ones, a plain link: the candidates' own short clips are the videos to watch.
export function RaceVideos({ race }: { race: BallotItem }) {
  const videos = sharedVideos(race)
  if (!videos.length) return null
  if (videos.every((v) => videoTier({ video: v }) === 'meal'))
    return (
      <p className="flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
        <span className="font-semibold text-sky-900">Go deep, together:</span>
        {shortestFirst(videos).map((v) => (
          <a
            key={v.youtubeId}
            href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
            title={`${v.title} (${v.host ?? v.channel})`}
            className="rounded-full border border-gray-200 bg-white px-2 py-0.5 font-semibold text-gray-700 hover:bg-gray-50"
          >
            ▶ {MEAL_NAMES[v.kind]} · {v.host ?? v.channel}
            {formatDuration(v.durationSec) ? ` · ${formatDuration(v.durationSec)}` : ''}
          </a>
        ))}
      </p>
    )
  return videos.length > 1 ? <VideoCarousel videos={videos} tiny label="Watch them together" /> : (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-semibold text-sky-900">Watch them together</p>
      <VideoFacade video={videos[0]} tiny />
    </div>
  )
}

// Every video of them not already shown above the race: their own (most independent first), then
// their part of a race forum (from where they first speak; the whole forum is already above)
function candidateVideos(candidate: BallotCandidate, race: BallotItem): VideoPick[] {
  const together = new Set(sharedVideos(race).map((v) => v.youtubeId))
  const own = sortVideos((candidate.profile?.videos ?? []).filter((v) => !together.has(v.youtubeId))).flatMap((video) => [
    ...(video.clip ? [{ video, ...video.clip }] : []),
    { video },
  ])
  const forums = (raceExtrasOf(race.metadata)?.videos ?? []).flatMap((video) => {
    const them = video.participants?.find((p) => p.id === candidate.id)
    return them?.startSec !== undefined ? [{ video, startSec: them.startSec, endSec: them.endSec }] : []
  })
  return [...own, ...forums]
}

const MEAL_NAMES: Record<CandidateVideo['kind'], string> = {
  forum: 'Full forum',
  debate: 'Full debate',
  meeting: 'Council meeting',
  interview: 'Full interview',
  statement: 'Full statement',
  explainer: 'Full explainer',
}

function ladderLabel(pick: VideoPick & { tier: VideoTier }): string {
  const len = formatDuration(watchLength(pick))
  const name = pick.tier === 'bite' ? 'Quick look' : pick.tier === 'snack' ? 'Short video' : MEAL_NAMES[pick.video.kind]
  const start = pick.startSec ?? pick.video.startSec
  const at = start ? `their part from ${clockOf(start)}` : null
  return [name, len ?? at].filter(Boolean).join(' · ')
}

function clockOf(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}` : `${m}:${String(sec % 60).padStart(2, '0')}`
}

// Bite → snack → meal: one button per length we have, shortest first; the current one is outlined
function VideoSteps({
  ladder,
  playing,
  onPlay,
}: {
  ladder: (VideoPick & { tier: VideoTier })[]
  playing: number | null
  onPlay: (i: number) => void
}) {
  if (!ladder.length || (ladder.length === 1 && playing === 0)) return null
  return (
    <p className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.6875rem]">
      <span className="text-gray-600">{playing === null ? 'Watch:' : 'Also:'}</span>
      {ladder.map((pick, i) => (
        <button
          key={pick.video.youtubeId + i}
          type="button"
          onClick={() => onPlay(i)}
          aria-pressed={playing === i}
          title={`${pick.video.title} (${pick.video.channel})`}
          className={`rounded-full border px-2 py-0.5 font-semibold ${
            playing === i ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-sky-300 bg-white text-blue-700 hover:bg-sky-100'
          }`}
        >
          ▶ {ladderLabel(pick)}
        </button>
      ))}
    </p>
  )
}

function FlagCell({ candidate }: { candidate: BallotCandidate }) {
  const { checked, flags } = flagsFor(candidate.profile)
  return (
    <Cell how="flags" title={<><FlagIcon className="mr-0.5 inline h-3 w-3 align-[-1px]" />Flags</>}>
      {flags.length ? (
        <>
        <p className="mb-1 text-xs font-semibold">{flagCounts(flags)}</p>
        <ul className="space-y-1 text-xs leading-snug">
          {flags.map((f, i) => (
            <li key={`${f.rule}-${i}`} className="flex gap-1">
              <span aria-label={f.level === 'red' ? 'Red flag' : 'Yellow flag'} className={`mt-1 h-2 w-2 shrink-0 rounded-full ${f.level === 'red' ? 'bg-red-600' : 'bg-amber-400'}`} />
              <span>
                {f.text} <span className="text-gray-600">(<Src href={f.source.url}>{f.source.label}</Src>)</span>
              </span>
            </li>
          ))}
        </ul>
        </>
      ) : checked.length ? (
        <p className="text-xs leading-snug">
          <span className="font-semibold text-green-800">None found</span>{' '}
          <span className="text-gray-600">Checked: {checked.map((r) => FLAG_RULES[r].check).join('; ')}</span>
        </p>
      ) : null}
      {!flags.length && !checked.length && (
        <p className="text-xs leading-snug text-gray-500">No checks for this race yet</p>
      )}
    </Cell>
  )
}

// What each check looked at, with its source, so "none found" can be checked too
function CheckedDetail({ candidate }: { candidate: BallotCandidate }) {
  const bar = candidate.profile?.bar
  const ethics = candidate.profile?.ethics
  const { checked, flags } = flagsFor(candidate.profile)
  if (!checked.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs leading-snug text-gray-700">
      <p className="font-semibold text-gray-900">What we checked{flags.length ? ' and what we found' : ''}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {flags
          .filter((f) => f.detail)
          .map((f, i) => (
            <li key={i}>
              {f.detail} (<Src href={f.source.url}>{f.source.label}</Src>)
            </li>
          ))}
        {bar && (
          <li>
            {bar.unmatched ? (
              bar.unmatched === 'none' ? (
                <>State Bar: no record found under this name (they may be licensed under another name, or elsewhere)</>
              ) : (
                <>State Bar: several lawyers share this name, so we couldn&apos;t tell which record is theirs</>
              )
            ) : (
              <>
                <Src href={bar.url}>State Bar</Src>: {bar.status}
                {bar.admitted && `, admitted ${bar.admitted}`}, {bar.discipline?.length ? 'public discipline listed' : 'no public discipline listed'}
              </>
            )}
          </li>
        )}
        {ethics && (
          <li>
            FPPC: {ethics.releases} monthly enforcement releases searched ({ethics.from} to {ethics.to}),{' '}
            {ethics.fines.length ? `${ethics.fines.length} fine${ethics.fines.length > 1 ? 's' : ''}` : 'no fines under this name'}
          </li>
        )}
        {candidate.profile?.guide && (candidate.profile.guide.answers?.length || /did not respond/i.test(candidate.profile.guide.note ?? '')) && (
          <li>
            <Src href={candidate.profile.guide.source.url}>LAist</Src> survey: {candidate.profile.guide.answers?.length ? 'answered' : 'didn\u2019t answer'}
          </li>
        )}
      </ul>
    </div>
  )
}

// Claims a news fact-check examined, its verdict in its own words
function Claims({ candidate }: { candidate: BallotCandidate }) {
  const claims = candidate.profile?.claims ?? []
  if (!claims.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs leading-snug">
      <p className="font-semibold text-gray-900">
        {claims.length} claim{claims.length > 1 ? 's' : ''} fact-checked by {[...new Set(claims.map((c) => c.publisher))].join(', ')}
      </p>
      <ul className="mt-1 space-y-1.5">
        {claims.map((c) => (
          <li key={c.claim}>
            <p className="italic">“{c.claim}”</p>
            <p>
              <span className="font-semibold">Verdict:</span> {c.verdict} (<Src href={c.url}>{c.publisher}</Src>)
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-gray-600">In the outlet&apos;s words; not counted in the 💩 %.</p>
    </div>
  )
}

function rulingsLine(fc: FactCheckRecord): string {
  return (Object.entries(fc.counts) as [keyof typeof RULING_LABELS, number][])
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${n} ${RULING_LABELS[r]}`)
    .join(' · ')
}

function FactCheckCell({ candidate, comparable }: { candidate: BallotCandidate; comparable: boolean }) {
  const fc = candidate.profile?.factCheck
  const score = factCheckScore(fc)
  return (
    <Cell how="meter" title={<>💩 meter</>}>
      {fc && score.pct !== null && comparable ? (
        <div className="text-xs leading-snug">
          <p className="text-xl font-black leading-none">{score.pct}%</p>
          <p className="mt-0.5">
            {score.falseish} of {score.total} claims <Src href={fc.url}>PolitiFact</Src> checked were rated Mostly False or worse
            {fc.latestYear && <span className="text-gray-600"> (newest ruling {fc.latestYear})</span>}
          </p>
          <p className="mt-0.5 font-mono text-[0.625rem] text-gray-600" title="The formula, with this candidate's numbers">
            ({fc.counts['mostly-false']} MF + {fc.counts.false} F + {fc.counts['pants-fire']} PoF) ÷ {score.total} = {score.pct}%
          </p>
        </div>
      ) : fc && score.total > 0 ? (
        <div className="text-xs leading-snug">
          <p className="text-xl font-black leading-none text-gray-400">–</p>
          <p className="mt-0.5 text-gray-700">
            {score.pct === null ? `Only ${score.total} PolitiFact ruling${score.total === 1 ? '' : 's'}: too few to score` : 'Not scored: not everyone in this race has enough PolitiFact rulings'}{' '}
            (<Src href={fc.url}>{rulingsLine(fc)}</Src>)
            {fc.latestYear && <span className="text-gray-600"> (newest ruling {fc.latestYear})</span>}
          </p>
        </div>
      ) : (
        <div className="text-xs leading-snug">
          <p className="text-xl font-black leading-none text-gray-400">–</p>
          <p className="mt-0.5 text-gray-500">No PolitiFact rulings on them</p>
        </div>
      )}
      {(candidate.profile?.claims.length ?? 0) > 0 && (
        <p className="mt-0.5 text-[0.6875rem] text-gray-600">+ {candidate.profile!.claims.length} debate claims checked, below</p>
      )}
    </Cell>
  )
}

const BADGE_STYLE: Record<string, string> = {
  left: 'border-blue-300 bg-blue-50 text-blue-950',
  right: 'border-red-300 bg-red-50 text-red-950',
  neutral: 'border-gray-300 bg-gray-50 text-gray-900',
  rating: 'border-sky-300 bg-sky-100 text-sky-950',
}

export function BadgePill({ badge }: { badge: Badge }) {
  const tone = badge.kind === 'rating' ? 'rating' : badge.lean ?? 'neutral'
  const body = (
    <span
      title={badge.quote ? `“${badge.quote}”` : undefined}
      className={`inline-block max-w-full rounded-xl border px-1.5 py-px text-[0.6875rem] font-semibold leading-snug ${BADGE_STYLE[tone]}`}
    >
      {badge.label}
    </span>
  )
  return isHttpUrl(badge.url) ? (
    <a href={badge.url} target="_blank" rel="noopener noreferrer" className="max-w-full hover:opacity-80">
      {body}
    </a>
  ) : (
    body
  )
}

function BadgeCell({ candidate, badges }: { candidate: BallotCandidate; badges: Badge[] }) {
  const p = candidate.profile
  const g = p?.guide
  const all: Badge[] = [
    ...(p?.barRating ? [{ by: p.barRating.by, kind: 'rating' as const, label: `${p.barRating.value} (bar assn.)`, url: p.barRating.source.url }] : []),
    ...badges,
  ]
  const named = g?.keyEndorsements ?? []
  return (
    <Cell how="badges" title="🏅 Badges">
      <div className="space-y-1 text-xs leading-snug">
        {candidate.incumbent && <span className="mr-1 inline-block rounded-full bg-sky-200 px-1.5 py-px text-[0.6875rem] font-semibold">Incumbent</span>}
        {all.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {all.map((b) => (
              <BadgePill key={b.by} badge={b} />
            ))}
          </div>
        )}
        {(named.length > 0 || g?.endorsementsLine) && (
          <p className="line-clamp-2">
            <span className="font-semibold">Key endorsements</span> (<Src href={g!.source.url}>{g!.source.publisher}</Src>):{' '}
            {named.length ? named.slice(0, 3).join(' · ') + (named.length > 3 ? ` +${named.length - 3}` : '') : g!.endorsementsLine}
          </p>
        )}
        {p && p.endorserTotal > 0 && (
          <Link href={`/candidates/${candidate.id}#endorsements`} className="flex items-center gap-1.5 hover:underline">
            <EndorserStrip endorsers={p.endorsers.slice(0, 4)} total={Math.min(4, p.endorsers.length)} />
            <span>{p.endorserTotal.toLocaleString()} on their site</span>
          </Link>
        )}
        {!candidate.incumbent && !all.length && !named.length && !g?.endorsementsLine && !(p && p.endorserTotal > 0) && (
          // Never "no endorsements": campaigns that don't publish a list we can read still have them
          <p className="text-gray-500">No badges from our sources (that doesn&apos;t mean no endorsements)</p>
        )}
      </div>
    </Cell>
  )
}

// Hover text and chip text for each column, so the compact row says what the full card says
// The flag takes the color of the worst finding: red, else yellow, else green when checks ran and
// found nothing, else gray (nothing checked). The bubble counts flags, or the clean checks.
const FLAG_COLORS = {
  red: 'fill-red-600 text-red-700',
  yellow: 'fill-amber-400 text-amber-600',
  green: 'fill-green-600 text-green-700',
  none: 'fill-gray-200 text-gray-400',
}

function ColoredFlag({ color }: { color: keyof typeof FLAG_COLORS }) {
  return <FlagIcon className={`h-6 w-6 ${FLAG_COLORS[color]}`} strokeWidth={1.75} />
}

function flagCounts(flags: { level: string }[]): string {
  const red = flags.filter((f) => f.level === 'red').length
  const yellow = flags.length - red
  return [red ? `${red} red` : '', yellow ? `${yellow} yellow` : ''].filter(Boolean).join(' · ')
}

function flagSummary(candidate: BallotCandidate): TileInfo {
  const { checked, flags } = flagsFor(candidate.profile)
  if (flags.length) {
    const red = flags.some((f) => f.level === 'red')
    return {
      icon: <ColoredFlag color={red ? 'red' : 'yellow'} />,
      value: String(flags.length),
      label: `${flagCounts(flags)} flag${flags.length > 1 ? 's' : ''}`,
      tone: red ? 'border-red-400 bg-red-50' : 'border-amber-400 bg-amber-50',
      mark: red ? 'bg-red-600 text-white' : 'bg-amber-400 text-amber-950',
      hover: flags.map((f) => `${f.level === 'red' ? 'Red' : 'Yellow'}: ${f.text} (${f.source.label})`).join('\n'),
    }
  }
  if (checked.length)
    return {
      // No bubble: the green flag already says "none found" (a number there reads as a flag count)
      icon: <ColoredFlag color="green" />,
      value: '',
      label: `No flags in ${checked.length} check${checked.length > 1 ? 's' : ''}`,
      tone: 'border-green-300 bg-green-50',
      mark: 'bg-green-700 text-white',
      hover: `None found. Checked: ${checked.map((r) => FLAG_RULES[r].check).join('; ')}`,
    }
  return { icon: <ColoredFlag color="none" />, value: '–', label: 'No checks yet', tone: 'border-gray-200 bg-white opacity-60', mark: 'bg-gray-200 text-gray-700', hover: 'No flag checks cover this race yet' }
}

function meterSummary(candidate: BallotCandidate, comparable: boolean) {
  const fc = candidate.profile?.factCheck
  const score = factCheckScore(fc)
  const claims = candidate.profile?.claims.length ?? 0
  const extra = claims ? `\n${claims} debate claim${claims > 1 ? 's' : ''} fact-checked by ${candidate.profile!.claims[0].publisher} (not in the %)` : ''
  if (fc && score.pct !== null && comparable)
    return { icon: '💩', value: `${score.pct}%`, label: `${score.pct}% Mostly False or worse`, tone: 'border-amber-700/40 bg-amber-50', mark: 'bg-amber-800 text-white', hover: `${score.falseish} of ${score.total} PolitiFact rulings were Mostly False or worse${extra}` }
  if (fc && score.total)
    return { icon: '💩', value: `${score.falseish}/${score.total}`, label: `${score.falseish} of ${score.total} PolitiFact rulings Mostly False or worse${fc.latestYear ? ` (newest ${fc.latestYear})` : ''}`, tone: 'border-amber-700/30 bg-white', mark: 'bg-amber-100 text-amber-950', hover: `${score.pct === null ? `Only ${score.total} PolitiFact ruling${score.total === 1 ? '' : 's'}: too few to score` : 'Not scored: not everyone in this race has enough PolitiFact rulings'} (${rulingsLine(fc)})${extra}` }
  return {
    icon: '💩',
    value: claims ? `${claims}✓` : '–',
    label: claims ? `${claims} debate claim${claims > 1 ? 's' : ''} fact-checked` : 'No PolitiFact rulings',
    tone: claims ? 'border-gray-300 bg-white' : 'border-gray-200 bg-white opacity-60',
    mark: 'bg-gray-200 text-gray-700',
    hover: `No PolitiFact rulings on them${extra}`,
  }
}

function badgeSummary(candidate: BallotCandidate, badges: Badge[]) {
  const g = candidate.profile?.guide
  const names = [
    ...(candidate.incumbent ? ['Incumbent'] : []),
    ...(candidate.profile?.barRating ? [`${candidate.profile.barRating.value} (${candidate.profile.barRating.by})`] : []),
    ...badges.map((b) => `Endorsed by ${b.by}`),
    ...((g?.keyEndorsements?.length || g?.endorsementsLine) ? [`Key endorsements, per ${g.source.publisher}: ${g.keyEndorsements?.slice(0, 4).join(', ') ?? g.endorsementsLine}`] : []),
    ...(candidate.profile?.endorserTotal ? [`${candidate.profile.endorserTotal.toLocaleString()} endorsements on their site`] : []),
  ]
  const count = (candidate.incumbent ? 1 : 0) + (candidate.profile?.barRating ? 1 : 0) + badges.length
  // Endorsements we can count: the campaign site's list, else the news guide's named ones
  const endorsements = candidate.profile?.endorserTotal || g?.keyEndorsements?.length || 0
  const parts = [
    ...(count ? [`${count} badge${count > 1 ? 's' : ''}`] : []),
    ...(endorsements ? [`${endorsements.toLocaleString()} endorsement${endorsements > 1 ? 's' : ''}`] : g?.endorsementsLine ? ['Endorsements'] : []),
  ]
  return {
    icon: '🏅',
    value: count + endorsements ? (count + endorsements).toLocaleString() : names.length ? '+' : '–',
    label: parts.length ? parts.join(' · ') : 'No badges',
    tone: count || names.length ? 'border-sky-300 bg-sky-50' : 'border-gray-200 bg-white opacity-60',
    mark: count || names.length ? 'bg-sky-700 text-white' : 'bg-gray-200 text-gray-700',
    hover: names.length ? names.join('\n') : "No badges from our sources (that doesn't mean no endorsements)",
  }
}

interface TileInfo {
  icon: React.ReactNode
  // The corner bubble; empty for none
  value: string
  label: string
  tone: string
  mark: string
  hover: string
}

// A 40px icon with its value in a corner marker; hover for the details, click for the full cards
function IconTile({ tile, onClick, open }: { tile: TileInfo; onClick: () => void; open: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      title={tile.hover}
      aria-label={`${tile.label}. ${tile.hover.replace(/\n/g, '. ')}. ${open ? 'Hide' : 'Show'} details`}
      className={`relative flex h-10 min-w-10 items-center justify-center rounded-xl border px-1 text-xl leading-none hover:brightness-95 ${tile.tone} ${
        open ? 'ring-2 ring-blue-600 ring-offset-2' : ''
      }`}
    >
      <span aria-hidden>{tile.icon}</span>
      {tile.value && (
        <span aria-hidden className={`absolute -right-2 -top-2 min-w-5 rounded-full px-1 text-center text-[0.6875rem] font-bold leading-5 ${tile.mark}`}>
          {tile.value}
        </span>
      )}
    </button>
  )
}

type Section = 'flags' | 'meter' | 'badges' | 'more'

// Beside one candidate's oval: their video (when we have one) across the whole column, the one-line
// summary under it, then a row of its own with an icon per column (details on hover). Clicking an icon opens just that column's card below;
// clicking it again closes it. "More" opens the news guide, statement and notes.
export function CandidateScorecard({
  candidate,
  race,
  badges,
  summary,
  children,
}: {
  candidate: BallotCandidate
  race: BallotItem
  badges: Badge[]
  // The one-line summary, always shown
  summary?: React.ReactNode
  // More about them (news guide, statement, notes)
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState<Section | null>(null)
  const comparable = raceHasFactChecks(race.office?.candidates ?? [])
  const toggle = (section: Section) => setOpen((o) => (o === section ? null : section))
  const tiles: [Section, TileInfo][] = [
    ['flags', flagSummary(candidate)],
    ...(raceHasAnyFactChecks(race.office?.candidates ?? []) ? [['meter', meterSummary(candidate, comparable)] as [Section, TileInfo]] : []),
    ['badges', badgeSummary(candidate, badges)],
  ]
  const ladder = videoLadder(candidateVideos(candidate, race))
  // The most independent bite or snack leads; with only meals, the shortest (just a thumbnail until clicked)
  const [playing, setPlaying] = useState<number | null>(() => {
    if (!ladder.length) return null
    const lead = leadRung(ladder)
    return lead < 0 ? 0 : lead
  })
  const current = playing === null ? null : ladder[playing]
  return (
    <div className="h-full space-y-3 bg-white px-3 py-3 font-sans print:hidden">
      {current && <VideoFacade key={playing} video={current.video} startSec={current.startSec} endSec={current.endSec} tiny />}
      <div className="min-w-0 space-y-3">
        {summary}
        <div className={`grid grid-cols-3 items-start gap-2 pr-2 ${current || summary ? 'border-t border-gray-100 pt-3' : ''}`}>
          {tiles.map(([section, tile]) => (
            <span key={section} className="flex min-w-0 items-start gap-2 max-sm:flex-col sm:items-center">
              <IconTile tile={tile} onClick={() => toggle(section)} open={open === section} />
              <span aria-hidden className="text-[0.6875rem] leading-tight text-gray-600">
                {tile.label}
              </span>
            </span>
          ))}
        </div>
        <VideoSteps ladder={ladder} playing={playing} onPlay={setPlaying} />
        {children && (
          <button type="button" onClick={() => toggle('more')} aria-expanded={open === 'more'} className="text-xs font-semibold text-blue-700 hover:underline">
            {open === 'more' ? 'Less' : 'More about them'}
          </button>
        )}
      </div>
      {open === 'flags' && (
        <div className="space-y-1.5">
          <FlagCell candidate={candidate} />
          <CheckedDetail candidate={candidate} />
        </div>
      )}
      {open === 'meter' && (
        <div className="space-y-1.5">
          <FactCheckCell candidate={candidate} comparable={comparable} />
          <Claims candidate={candidate} />
        </div>
      )}
      {open === 'badges' && <BadgeCell candidate={candidate} badges={badges} />}
      {open === 'more' && children}
    </div>
  )
}

// A measure's badges: who recommends Yes and who recommends No
export function MeasureBadges({ yes, no, labels }: { yes: Badge[]; no: Badge[]; labels: [string, string] }) {
  if (!yes.length && !no.length) return null
  const sides = [[labels[0], yes], [labels[1], no]] as const
  return (
    <div className="grid gap-2 pt-2 font-sans sm:grid-cols-2">
      {sides.map(([label, list]) => (
        <Cell key={label} how="badges" title={`🏅 Say ${label}`}>
          {list.length ? (
            <div className="flex flex-wrap gap-1">
              {list.map((b) => (
                <BadgePill key={b.by} badge={b} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">None in the guides we use</p>
          )}
        </Cell>
      ))}
    </div>
  )
}
