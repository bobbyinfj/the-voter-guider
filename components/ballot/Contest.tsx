'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, CheckCircle2, ChevronDown, CircleHelp, ExternalLink, Info, Link2, PlayCircle } from 'lucide-react'
import MeasureExplainer, { measureOfficial } from '@/components/MeasureExplainer'
import VideoFacade from '@/components/candidate/VideoFacade'
import { EndorserStrip } from '@/components/candidate/Endorsements'
import RaceExtras from '@/components/candidate/RaceExtras'
import NewsGuide from '@/components/candidate/NewsGuide'
import CompareStrip from '@/components/compare/CompareStrip'
import OfficialDocs, { documentsOf, statementOf } from './OfficialDocs'
import type { CompareView } from '@/components/compare/compare'
import type { QuizOnBallot } from '@/lib/quiz/ballot'
import { VIDEO_KIND_LABELS, formatDuration, guideCredit, isHttpUrl, raceExtrasOf } from '@/lib/profile'
import {
  ABSTAIN,
  MEASURE_VALUES,
  NOTES_ONLY,
  UNSURE,
  WRITE_IN,
  choiceLabel,
  candidateDomId,
  contestDomId,
  openingSentence,
  isMeasure,
  isPick,
  isSettled,
  layoutOf,
  optionList,
  type BallotCandidate,
  type BallotItem,
  type ChoiceStatus,
  type ChoiceValue,
} from './ballot'
import { ContestHead, Extra } from './Paper'
import { CandidateScorecard, MeasureBadges, RaceVideos, sharedVideos } from './Scorecard'
import type { BadgeMap } from '@/lib/scorecard'

// basic: the 3-column ballot replica. expanded: one column with every contest's extras open
export type Density = 'basic' | 'expanded'

interface ContestProps {
  // One contest, or several questions printed under one heading (judicial retention)
  run: BallotItem[]
  electionId: string
  choices: Record<string, ChoiceValue>
  readOnly: boolean
  density: Density
  onChange: (itemId: string, selection: string, notes?: string, status?: ChoiceStatus) => void
  onClear: (itemId: string) => void
  onStatus?: (itemId: string, status: ChoiceStatus) => void
  onCandidateNote?: (itemId: string, name: string, text: string) => void
  // What your quiz answers matched in each race, by ballot id
  quiz?: Record<string, QuizOnBallot> | null
  // Published guides' picks, as badges in the Expanded view
  badges?: BadgeMap | null
  // Basic view: switch to Expanded and show this contest
  onExpand?: (domId: string) => void
  compare?: CompareView | null
  // Other contests printed under the same jurisdiction line, for "copy a link to all of them"
  linkGroup?: { id: string; label: string; count: number }
}

// Copy a link to this part of the ballot (also puts it in the address bar). With more than one
// target (this contest, or every contest in its group) it asks which.
function CopyLink({ targets, label }: { targets: { id: string; label: string }[]; label: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [choosing, setChoosing] = useState(false)
  const copy = async (id: string) => {
    setChoosing(false)
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${id}`
    history.replaceState(null, '', `#${id}`)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => (targets.length > 1 ? setChoosing((v) => !v) : copy(targets[0].id))}
        aria-expanded={targets.length > 1 ? choosing : undefined}
        aria-label={label}
        title={copied ? 'Link copied' : label}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-blue-700"
      >
        {copied ? <Check className="h-4 w-4 text-green-700" /> : <Link2 className="h-4 w-4" />}
      </button>
      {copied && (
        <span role="status" className="absolute right-0 top-full z-30 mt-1 whitespace-nowrap rounded bg-gray-900 px-2 py-0.5 font-sans text-[0.6875rem] text-white">
          Link copied
        </span>
      )}
      {choosing && (
        <span className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-gray-200 bg-white p-1 font-sans text-xs shadow-lg">
          {targets.map((t) => (
            <button key={t.id} type="button" onClick={() => copy(t.id)} className="block w-full rounded px-2 py-1 text-left hover:bg-gray-100">
              {t.label}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

// One line about a candidate, shown under their name, always labeled with where it's from:
// the first sentence of their own statement (state voter guide, else the county's sample ballot
// booklet); for a judge, the bar association's rating; else the first sentence of a news voter
// guide's description. Nothing when none of those exist; we never write one ourselves.
function CandidateLine({ race, name }: { race: BallotItem; name: string }) {
  const line = candidateLine(race, name)
  if (!line) return null
  return (
    <span className="mt-0.5 block font-sans text-[0.6875rem] leading-snug text-sky-900 print:hidden" title={line.source}>
      <span className="line-clamp-2">
        {line.quote ? `“${line.text}”` : line.text} <span className="text-sky-600">· {line.short}</span>
      </span>
    </span>
  )
}

function candidateLine(race: BallotItem, name: string): { text: string; source: string; short: string; quote: boolean } | null {
  const profile = race.office?.candidates.find((c) => c.name === name)?.profile
  const headline = profile?.headline
  if (headline && !/^no candidate statement/i.test(headline.text)) {
    const first = openingSentence(headline.text) ?? headline.text
    return { text: first, source: 'From their state voter guide statement', short: 'their statement', quote: true }
  }
  const doc = statementOf(race.metadata, name)
  const first = doc && openingSentence(doc.text)
  if (first) return { text: first, source: 'From their county ballot booklet statement', short: 'their statement', quote: true }
  const guide = profile?.guide
  if (guide?.rating) return { text: `Rated ${guide.rating.value}`, source: `By the ${guide.rating.by}`, short: 'county bar assn.', quote: false }
  const about = guide?.about && openingSentence(guide.about)
  if (guide && about) return { text: about, source: `From ${guideCredit(guide)}'s voter guide`, short: guide.source.publisher, quote: true }
  return null
}

// The oval a voter fills in; the radio input is visually hidden but keeps keyboard
// (arrow keys within a contest) and screen reader behaviour. It listens for clicks, not changes,
// so clicking an oval that's already filled steps it on (see stepPick)
function Oval({
  name,
  value,
  checked,
  status = 'decided',
  disabled,
  onSelect,
  label,
  children,
}: {
  name: string
  value: string
  checked: boolean
  // How sure you are of this pick: ? in the oval (unsure), hatched (leaning) or filled (decided)
  status?: ChoiceStatus
  disabled: boolean
  onSelect: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <label
      className={`flex min-w-0 flex-1 items-start gap-2.5 px-2 py-1.5 ${disabled ? '' : 'cursor-pointer hover:bg-gray-50'} ${
        checked ? 'bg-blue-50 print:bg-white' : ''
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => {}}
        onClick={onSelect}
        aria-label={checked && status !== 'decided' ? `${label} (${status === 'unsure' ? 'not sure' : 'leaning'})` : label}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`mt-0.5 flex h-3.5 w-6 shrink-0 items-center justify-center rounded-[50%] border-[1.5px] border-ballot-ink bg-white text-[0.625rem] font-bold leading-none text-purple-700 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-1 ${
          status === 'unsure'
            ? ''
            : status === 'tentative'
              ? 'peer-checked:bg-[repeating-linear-gradient(135deg,var(--ballot-ink)_0_2px,transparent_2px_5px)]'
              : 'peer-checked:bg-ballot-ink'
        }`}
      >
        {checked && status === 'unsure' && '?'}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  )
}

// Expanded view: a ballot row on the left third and our extras for it on the right two-thirds
// (stacked on a phone)
function BesideRow({
  id,
  wide,
  aside,
  children,
}: {
  id?: string
  wide: boolean
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  if (!wide) return <div id={id}>{children}</div>
  return (
    <div id={id} className="sm:grid sm:grid-cols-3">
      <div className="flex min-w-0 sm:border-r sm:border-gray-300">{children}</div>
      <div className="min-w-0 sm:col-span-2">{aside}</div>
    </div>
  )
}

// Saves itself a moment after you stop typing, and when you leave the box
function NotesField({
  initial,
  onSave,
  label = 'Your notes on this contest',
  placeholder = 'Notes on this contest: why this pick, what to look up… (for you, and anyone you share with)',
}: {
  initial: string
  onSave: (notes: string) => void
  label?: string
  placeholder?: string
}) {
  const [value, setValue] = useState(initial)
  const saved = useRef(initial)
  const timer = useRef<number | null>(null)
  const latest = useRef(onSave)
  useEffect(() => {
    latest.current = onSave
  })
  const flush = (text: string) => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    if (text === saved.current) return
    saved.current = text
    latest.current(text)
  }
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current)
  }, [])
  return (
    <textarea
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(e) => {
        const text = e.target.value
        setValue(text)
        if (timer.current) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => flush(text), 800)
      }}
      onBlur={() => flush(value)}
      className="w-full rounded border border-sky-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
      rows={2}
      maxLength={5000}
    />
  )
}

function RaceChoices({
  item,
  choice,
  readOnly,
  onChange,
  onPick,
  aside,
}: {
  item: BallotItem
  choice?: ChoiceValue
  readOnly: boolean
  onChange: ContestProps['onChange']
  onPick: (selection: string) => void
  // Expanded view: what we know about each candidate, beside their oval
  aside?: (name: string) => React.ReactNode
}) {
  const printed = layoutOf(item)
  const selection = choice?.selection
  const isWriteIn = selection?.startsWith(WRITE_IN) ?? false
  const [writeIn, setWriteIn] = useState(isWriteIn ? selection!.slice(WRITE_IN.length) : '')
  const people = new Map((item.office?.candidates ?? []).map((c) => [c.name, c]))
  const rows =
    printed?.candidates ??
    optionList(item.options).map((name) => ({ name, label: name, party: people.get(name)?.party ?? undefined }))
  const partyRight = printed?.style.party === 'right'
  const saveWriteIn = () => {
    const name = writeIn.trim()
    if (!name || selection === `${WRITE_IN}${name}`) return
    // Renaming your write-in keeps leaning/decided; a new write-in starts as leaning
    onChange(item.id, `${WRITE_IN}${name}`, choice?.notes, isWriteIn ? undefined : 'tentative')
  }
  return (
    <div className="divide-y divide-gray-200">
      {rows.map((row) => (
        <BesideRow key={row.name} id={candidateDomId(item, row.name)} wide={!!aside} aside={aside?.(row.name)}>
        <Oval
          name={item.id}
          value={row.name}
          label={row.label}
          checked={selection === row.name}
          status={choice?.status}
          disabled={readOnly}
          onSelect={() => onPick(row.name)}
        >
          <span className={partyRight ? 'flex items-baseline justify-between gap-2' : 'block'}>
            <span className="block text-[0.8125rem] font-semibold leading-snug">{row.label}</span>
            {row.party && (
              <span className={`text-[0.6875rem] leading-snug ${partyRight ? 'shrink-0 text-right' : 'block'}`}>
                {partyRight || !printed || row.party.includes(':') ? row.party : `(${row.party})`}
              </span>
            )}
          </span>
          {'designation' in row && row.designation && <span className="block text-[0.6875rem] leading-snug">{row.designation}</span>}
          {!aside && <CandidateLine race={item} name={row.name} />}
        </Oval>
        </BesideRow>
      ))}
      {(printed ? printed.writeIn : true) && (
        <BesideRow wide={!!aside}>
        <Oval
          name={item.id}
          value={WRITE_IN}
          label={`Write-in for ${item.title}`}
          checked={isWriteIn}
          status={choice?.status}
          disabled={readOnly}
          onSelect={() => (isWriteIn ? onPick(selection!) : saveWriteIn())}
        >
          {readOnly ? (
            <span className="block min-h-[1.25rem] border-b border-gray-500 text-[0.8125rem] font-semibold uppercase">{writeIn}</span>
          ) : (
            <input
              type="text"
              aria-label={`Write-in name for ${item.title}`}
              value={writeIn}
              maxLength={100}
              onChange={(e) => setWriteIn(e.target.value)}
              onBlur={saveWriteIn}
              onKeyDown={(e) => e.key === 'Enter' && saveWriteIn()}
              className="block w-full border-0 border-b border-gray-500 bg-transparent px-0 py-0 text-[0.8125rem] uppercase focus:border-blue-600 focus:outline-none focus:ring-0"
            />
          )}
          <span className="block text-[0.6875rem] text-gray-600">Write-in</span>
        </Oval>
        </BesideRow>
      )}
    </div>
  )
}

function MeasureChoices({
  item,
  choice,
  readOnly,
  onPick,
}: {
  item: BallotItem
  choice?: ChoiceValue
  readOnly: boolean
  onPick: (selection: string) => void
}) {
  const printed = layoutOf(item)
  const labels = printed?.responses?.length === 2 ? printed.responses : ['Yes', 'No']
  return (
    <div className={printed?.style.responses === 'inline' ? 'flex' : 'divide-y divide-gray-200'}>
      {MEASURE_VALUES.map((value, i) => (
        <Oval
          key={value}
          name={item.id}
          value={value}
          label={labels[i]}
          checked={choice?.selection === value}
          status={choice?.status}
          disabled={readOnly}
          onSelect={() => onPick(value)}
        >
          <span className="text-[0.8125rem] font-semibold">{labels[i]}</span>
        </Oval>
      ))}
    </div>
  )
}

function PrintedQuestion({ item }: { item: BallotItem }) {
  const printed = layoutOf(item)
  if (!printed?.question) return null
  return (
    <div className="space-y-2 px-2 py-2 text-[0.78125rem] leading-snug">
      <p className="whitespace-pre-line">{printed.question}</p>
      {printed.table && (
        <table className="w-full border-collapse text-[0.6875rem]">
          {printed.table.caption && <caption className="pb-1 text-left font-bold">{printed.table.caption}</caption>}
          <thead>
            <tr>
              {printed.table.columns.map((c) => (
                <th key={c} className="border border-gray-400 px-1 py-0.5 text-left align-bottom font-bold">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {printed.table.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, i) => (
                  <td key={i} className="border border-gray-400 px-1 py-0.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {printed.note && <p className="text-[0.6875rem]">{printed.note}</p>}
    </div>
  )
}

// One candidate in the snack panel: their own words (one line), endorsement circles, a video
// What your quiz answers matched in this race. With a clear match and nothing marked yet, one
// click puts it on the ballot as a ? pick: a suggestion you still have to confirm.
function QuizStrip({
  quiz,
  item,
  choice,
  readOnly,
  onChange,
}: {
  quiz: QuizOnBallot
  item: BallotItem
  choice?: ChoiceValue
  readOnly: boolean
  onChange: ContestProps['onChange']
}) {
  const open = !choice || choice.selection === NOTES_ONLY
  return (
    <div className="border-l-2 border-violet-400 bg-violet-50 px-2 py-1.5 font-sans text-xs text-violet-950 print:hidden">
      <p>
        <span className="font-semibold">Your quiz: {quiz.headline}.</span> {quiz.detail}{' '}
        <a href={quiz.href} className="text-blue-700 underline">
          See why
        </a>
      </p>
      {quiz.top &&
        (choice?.selection === quiz.top ? (
          <p className="mt-0.5 text-violet-800">That&apos;s your pick here.</p>
        ) : (
          !readOnly &&
          open && (
            <button
              type="button"
              onClick={() => onChange(item.id, quiz.top!, choice?.notes, 'unsure')}
              className="mt-1 rounded border border-violet-300 bg-white px-2 py-0.5 font-semibold text-violet-900 hover:bg-violet-100"
            >
              Mark {choiceLabel(quiz.top, item)} as ? (not sure yet)
            </button>
          )
        ))}
    </div>
  )
}

// Your own note on one candidate: a button until you start one
function CandidateNote({ name, note }: { name: string; note: { text?: string; onSave?: (text: string) => void } }) {
  const [open, setOpen] = useState(false)
  if (!note.onSave) return note.text ? <p className="whitespace-pre-line text-xs italic">Note: “{note.text}”</p> : null
  if (!note.text && !open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-blue-700 hover:underline">
        + Add a note on {name}
      </button>
    )
  return (
    <NotesField
      initial={note.text ?? ''}
      onSave={note.onSave}
      label={`Your notes on ${name}`}
      placeholder={`Your notes on ${name}: what you like, what to look up… (for you, and anyone you share with)`}
    />
  )
}

function CandidateSnack({
  candidate: c,
  race,
  anchorId,
  note,
  hideVideo = false,
}: {
  candidate: BallotCandidate
  race: BallotItem
  anchorId?: string
  note?: { text?: string; onSave?: (text: string) => void }
  // The scorecard already shows it
  hideVideo?: boolean
}) {
  const [watching, setWatching] = useState(false)
  const p = c.profile
  const video = hideVideo ? null : p?.video
  return (
    <div className="space-y-1">
      <div>
        <Link href={`/candidates/${c.id}`} className="font-semibold text-blue-700 hover:underline">
          {c.name}
        </Link>
        {c.incumbent && <span className="ml-1.5 rounded bg-sky-200 px-1 text-[0.625rem] font-semibold">incumbent</span>}
        {anchorId && (
          <span className="ml-1 inline-block align-middle">
            <CopyLink targets={[{ id: anchorId, label: c.name }]} label={`Copy a link to ${c.name}`} />
          </span>
        )}
      </div>
      {p?.headline ? (
        <p className="line-clamp-2 text-xs text-sky-900">
          <span className="font-semibold">{p.headline.label}:</span> {p.headline.text}
          {p.summarySource && <span className="text-sky-700"> (voters&apos; pamphlet)</span>}
        </p>
      ) : (
        <>
          {c.shortBio && <p className="text-xs text-sky-900">{c.shortBio}</p>}
          {statementOf(race.metadata, c.name) && candidateLine(race, c.name) && (
            <p className="line-clamp-2 text-xs text-sky-900">
              “{candidateLine(race, c.name)!.text}” <span className="text-sky-700">(county ballot booklet statement)</span>
            </p>
          )}
        </>
      )}
      {p?.guide && (
        <div className="border-t border-sky-200 pt-1">
          <NewsGuide guide={p.guide} compact />
        </div>
      )}
      {p && p.endorserTotal > 0 && (
        <Link href={`/candidates/${c.id}#endorsements`} className="flex items-center gap-2 text-xs text-sky-900 hover:underline">
          <EndorserStrip endorsers={p.endorsers.slice(0, 6)} total={Math.min(6, p.endorsers.length)} />
          <span>{p.endorserTotal.toLocaleString()} endorsements</span>
        </Link>
      )}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {video && (
          <button
            type="button"
            onClick={() => setWatching((w) => !w)}
            aria-expanded={watching}
            className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {watching ? 'Hide video' : `Watch ${VIDEO_KIND_LABELS[video.kind].toLowerCase()}`}
            {!watching && formatDuration(video.durationSec) && ` (${formatDuration(video.durationSec)})`}
          </button>
        )}
        {isHttpUrl(c.website) && (
          <a href={c.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-blue-700 hover:underline">
            Campaign site <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      {watching && video && <VideoFacade video={video} compact />}
      {statementOf(race.metadata, c.name) && <OfficialDocs docs={[statementOf(race.metadata, c.name)!]} />}
      {note && <CandidateNote name={c.name} note={note} />}
    </div>
  )
}

// Not sure, leaning or decided, for a pick you've made (not shown on paper)
function StatusPill({ status, onStatus }: { status: ChoiceStatus; onStatus: (status: ChoiceStatus) => void }) {
  return (
    <div role="radiogroup" aria-label="How sure are you?" className="flex justify-end px-2 pb-1.5 font-sans print:hidden">
      <div className="inline-flex overflow-hidden rounded-full border border-gray-300 text-[0.6875rem]">
        {(['unsure', 'tentative', 'decided'] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={status === value}
            onClick={() => onStatus(value)}
            className={`px-2 py-0.5 ${
              status === value
                ? value === 'decided'
                  ? 'bg-green-700 font-semibold text-white'
                  : value === 'tentative'
                    ? 'bg-amber-200 font-semibold text-amber-950'
                    : 'bg-purple-100 font-semibold text-purple-800'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {value === 'decided' ? 'Decided' : value === 'tentative' ? 'Leaning' : 'Not sure'}
          </button>
        ))}
      </div>
    </div>
  )
}

// Bite: one line, inline (expanded view). Snack: the expandable panel. Meal: links out.
function Enhancements({
  item,
  electionId,
  choice,
  readOnly,
  density,
  open,
  onChange,
  onClear,
  onCandidateNote,
  onExpand,
  candidatesBeside = false,
}: {
  item: BallotItem
  electionId: string
  choice?: ChoiceValue
  readOnly: boolean
  density: Density
  open: boolean
  onChange: ContestProps['onChange']
  onClear: ContestProps['onClear']
  onCandidateNote?: ContestProps['onCandidateNote']
  onExpand?: () => void
  // Expanded view shows each candidate beside their oval, so not again here
  candidatesBeside?: boolean
}) {
  const measure = isMeasure(item)
  const official = measure ? measureOfficial(item.metadata) : {}
  const source = official.sourceUrl ?? layoutOf(item)?.contestSource ?? layoutOf(item)?.source
  const selection = choice?.selection
  const people = item.office?.candidates ?? []
  const incumbents = people.filter((c) => c.incumbent).map((c) => c.name)
  const bite = measure
    ? item.description
    : incumbents.length
      ? `Incumbent: ${incumbents.join(', ')}`
      : people.length === 1
        ? 'Unopposed'
        : null

  if (!open) {
    if (density !== 'expanded' || !(bite || choice?.notes)) return null
    return (
      <Extra className="text-xs">
        {bite && <p className="line-clamp-2">{bite}</p>}
        {choice?.notes && <p className="mt-1 whitespace-pre-line italic">“{choice.notes}”</p>}
      </Extra>
    )
  }

  return (
    <Extra className="space-y-3 text-sm">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-sky-700">Voter Guider extras · not on your ballot</p>
      {onExpand && (
        <button
          type="button"
          onClick={onExpand}
          className="flex w-full items-center justify-between gap-2 rounded border border-sky-300 bg-white px-2 py-1.5 text-left text-xs font-semibold text-sky-900 hover:bg-sky-100"
        >
          <span>
            {measure ? 'See who says Yes and No, beside the question' : 'See them side by side: videos, 🚩 flags, 💩 meter, 🏅 badges'}
          </span>
          <span aria-hidden>Expanded view →</span>
        </button>
      )}
      {measure ? (
        <>
          {item.description && <p>{item.description}</p>}
          <MeasureExplainer official={{ ...official, sourceUrl: null }} />
          <OfficialDocs docs={documentsOf(item.metadata)} label="From the county's official voter information" />
        </>
      ) : (
        <>
          {!candidatesBeside && (
          <ul className="space-y-3">
            {people.map((c) => (
              <li key={c.id}>
                <CandidateSnack
                  candidate={c}
                  race={item}
                  note={{
                    text: choice?.candidateNotes?.[c.name],
                    onSave: readOnly || !onCandidateNote ? undefined : (text) => onCandidateNote(item.id, c.name, text),
                  }}
                />
              </li>
            ))}
          </ul>
          )}
          {raceExtrasOf(item.metadata) && (
            // Beside the candidates, debates are already shown above them
            <RaceExtras extras={candidatesBeside ? { ...raceExtrasOf(item.metadata)!, videos: [] } : raceExtrasOf(item.metadata)!} compact />
          )}
          {people.some((c) => c.profile?.endorserTotal) && (
            <p className="text-[0.6875rem] text-sky-800">
              Endorsements as listed on each campaign&apos;s website; some campaigns don&apos;t publish a list we can read.
            </p>
          )}
          {item.office && (
            <Link
              href={`/elections/${electionId}/offices/${item.office.id}`}
              className="inline-block text-xs font-semibold text-blue-700 hover:underline"
            >
              Compare candidates side by side →
            </Link>
          )}
        </>
      )}
      {source && (
        <a href={source} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-700 hover:underline">
          Official source <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {readOnly ? (
        choice?.notes && <p className="whitespace-pre-line italic">“{choice.notes}”</p>
      ) : (
        <div className="space-y-1.5">
          <NotesField
            initial={choice?.notes ?? ''}
            onSave={(notes) => {
              // Notes work with or without a pick; with none they're kept on their own
              if (selection && selection !== NOTES_ONLY) onChange(item.id, selection, notes)
              else if (notes.trim()) onChange(item.id, NOTES_ONLY, notes)
              else if (selection === NOTES_ONLY) onClear(item.id)
            }}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {selection === ABSTAIN ? (
              <span>Leaving this one blank on purpose</span>
            ) : (
              <button type="button" onClick={() => onChange(item.id, ABSTAIN)} className="hover:underline">
                Leave blank on purpose
              </button>
            )}
            {selection && selection !== NOTES_ONLY && (
              <button type="button" onClick={() => clearPick(item.id, choice, onChange, onClear)} className="hover:text-red-700 hover:underline">
                Clear{selection === ABSTAIN ? '' : ` (${choiceLabel(selection, item)})`}
              </button>
            )}
          </div>
        </div>
      )}
    </Extra>
  )
}

// Each click on an oval steps it along: empty → ? (not sure) → leaning (hatched) → decided
// (filled) → empty. Clicking a different oval in the contest moves your pick there, as ?.
// Clearing a pick keeps any notes you wrote on the contest.
function stepPick(
  itemId: string,
  selection: string,
  choice: ChoiceValue | undefined,
  onChange: ContestProps['onChange'],
  onClear: ContestProps['onClear'],
) {
  if (choice?.selection !== selection) onChange(itemId, selection, choice?.notes, 'unsure')
  else if (choice.status === 'unsure') onChange(itemId, selection, choice.notes, 'tentative')
  else if (choice.status === 'tentative') onChange(itemId, selection, choice.notes, 'decided')
  else clearPick(itemId, choice, onChange, onClear)
}

function clearPick(itemId: string, choice: ChoiceValue | undefined, onChange: ContestProps['onChange'], onClear: ContestProps['onClear']) {
  if (choice?.notes || Object.keys(choice?.candidateNotes ?? {}).length) onChange(itemId, NOTES_ONLY, choice?.notes)
  else onClear(itemId)
}

export default function Contest({
  run,
  electionId,
  choices,
  readOnly,
  density,
  onChange,
  onClear,
  onStatus,
  compare,
  linkGroup,
  onCandidateNote,
  quiz,
  badges,
  onExpand,
}: ContestProps) {
  // Expanded view opens every contest's extras; a contest you open or close yourself stays that
  // way until you switch views
  const [override, setOverride] = useState<{ density: Density; open: boolean } | null>(null)
  const open = override?.density === density ? override.open : density === 'expanded'
  const wide = density === 'expanded'
  const first = run[0]
  const printed = layoutOf(first)
  const heading = printed?.heading ?? [first.number ? `${first.number} ${first.title}` : first.title]
  const instructions = printed?.instructions ?? (isMeasure(first) ? [] : ['Vote for one'])
  const decided = run.every((i) => isSettled(choices[i.id]))
  const blank = run.every((i) => choices[i.id]?.selection === ABSTAIN)
  // "No clue yet" covers the whole contest (every question in a run); pressing it again clears it
  const unsure = run.every((i) => choices[i.id]?.selection === UNSURE)
  const toggleUnsure = () =>
    run.forEach((i) => (unsure ? clearPick(i.id, choices[i.id], onChange, onClear) : onChange(i.id, UNSURE, choices[i.id]?.notes)))
  const leaning = run.some((i) => isPick(choices[i.id]?.selection) && choices[i.id].status === 'tentative')

  return (
    <fieldset
      id={contestDomId(first)}
      data-item-id={first.id}
      className="group/contest mb-[-1.5px] min-w-0 scroll-mt-48 break-inside-avoid border-[1.5px] border-ballot-ink bg-ballot-paper"
    >
      <legend className="sr-only">{heading.join(' ')}</legend>
      <ContestHead heading={heading} instructions={instructions}>
        <div className="flex shrink-0 items-center gap-1 print:hidden">
          {decided && (
            <CheckCircle2
              aria-label={blank ? 'Left blank on purpose' : leaning ? 'Leaning' : 'Decided'}
              className={`h-4 w-4 ${blank ? 'text-gray-500' : leaning ? 'text-amber-600' : 'text-green-700'}`}
            />
          )}
          <span className={`flex items-center gap-1 ${unsure ? '' : 'transition-opacity [@media(hover:hover)]:opacity-0 group-hover/contest:opacity-100 group-focus-within/contest:opacity-100'}`}>
          <CopyLink
            label={`Copy a link to ${heading.join(' ')}`}
            targets={[
              { id: contestDomId(first), label: 'Link to this contest' },
              ...(linkGroup ? [{ id: linkGroup.id, label: `Link to all ${linkGroup.count} ${linkGroup.label} contests` }] : []),
            ]}
          />
          {(!readOnly || unsure) && (
            <button
              type="button"
              onClick={toggleUnsure}
              disabled={readOnly}
              aria-pressed={unsure}
              aria-label={`No clue yet on ${heading.join(' ')}`}
              title={unsure ? 'No clue yet. Click to clear' : 'No clue yet? Mark it'}
              className={`rounded p-0.5 ${
                unsure ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100 hover:text-purple-700'
              }`}
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          )}
          </span>
          <button
            type="button"
            onClick={() => setOverride({ density, open: !open })}
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} Voter Guider info for ${heading.join(' ')}`}
            className="flex items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold text-sky-800 hover:bg-sky-200"
          >
            <Info className="h-3.5 w-3.5" />
            {density === 'expanded' && (open ? 'Less' : 'More')}
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </ContestHead>
      {run.map((item, i) => {
        const choice = choices[item.id]
        const pick = (selection: string) => stepPick(item.id, selection, choice, onChange, onClear)
        const status = !readOnly && onStatus && choice && isPick(choice.selection) && (
          <StatusPill status={choice.status ?? 'decided'} onStatus={(value) => onStatus(item.id, value)} />
        )
        const strip = (
          <>
            {quiz?.[item.id] && (
              <QuizStrip quiz={quiz[item.id]} item={item} choice={choice} readOnly={readOnly} onChange={onChange} />
            )}
            {compare && <CompareStrip item={item} view={compare} mine={choice} />}
          </>
        )
        const extras = (
          <Enhancements
            item={item}
            electionId={electionId}
            choice={choice}
            readOnly={readOnly}
            density={density}
            open={open}
            onChange={onChange}
            onClear={onClear}
            onCandidateNote={onCandidateNote}
            onExpand={!wide && onExpand ? () => onExpand(contestDomId(first)) : undefined}
            candidatesBeside={wide}
          />
        )
        return (
          <div key={item.id} id={i > 0 ? contestDomId(item) : undefined} data-item-id={i > 0 ? item.id : undefined} className="scroll-mt-48 border-t border-gray-400">
            {wide ? (
              <>
                {isMeasure(item) ? (
                  <BesideRow
                    wide
                    aside={
                      <div className="space-y-1">
                        {open && (
                          <div className="px-2 pt-2">
                            <MeasureBadges
                              yes={badges?.[item.id]?.YES ?? []}
                              no={badges?.[item.id]?.NO ?? []}
                              labels={(layoutOf(item)?.responses?.length === 2 ? layoutOf(item)!.responses : ['Yes', 'No']) as [string, string]}
                            />
                          </div>
                        )}
                        {strip}
                        {extras}
                      </div>
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <PrintedQuestion item={item} />
                      <MeasureChoices item={item} choice={choice} readOnly={readOnly} onPick={pick} />
                      {status}
                    </div>
                  </BesideRow>
                ) : (
                  <>
                    {open && sharedVideos(item).length > 0 && (
                      <BesideRow wide aside={<RaceVideos race={item} />}>
                        <div className="flex-1" />
                      </BesideRow>
                    )}
                    <RaceChoices
                      item={item}
                      choice={choice}
                      readOnly={readOnly}
                      onChange={onChange}
                      onPick={pick}
                      aside={(name) => {
                        const c = open && item.office?.candidates.find((p) => p.name === name)
                        return c ? (
                          <CandidateScorecard
                            candidate={c}
                            race={item}
                            badges={badges?.[item.id]?.[c.name] ?? []}
                            summary={
                              <>
                                <CandidateLine race={item} name={c.name} />
                                {choice?.candidateNotes?.[c.name] && (
                                  <p className="line-clamp-1 text-xs italic text-gray-700">Your note: “{choice.candidateNotes[c.name]}”</p>
                                )}
                              </>
                            }
                          >
                            <details className="group/more text-sm">
                              <summary className="cursor-pointer text-xs font-semibold text-blue-700 hover:underline">
                                More on {c.name}: news guide, statement, notes
                              </summary>
                              <div className="mt-1.5 rounded border border-sky-200 bg-white p-2">
                                <CandidateSnack
                                  candidate={c}
                                  race={item}
                                  anchorId={candidateDomId(item, c.name)}
                                  hideVideo
                                  note={{
                                    text: choice?.candidateNotes?.[c.name],
                                    onSave:
                                      readOnly || !onCandidateNote ? undefined : (text) => onCandidateNote(item.id, c.name, text),
                                  }}
                                />
                              </div>
                            </details>
                          </CandidateScorecard>
                        ) : null
                      }}
                    />
                    <BesideRow wide aside={<div className="space-y-1">{strip}{extras}</div>}>
                      <div className="min-w-0 flex-1">{status}</div>
                    </BesideRow>
                  </>
                )}
              </>
            ) : (
              <>
                {isMeasure(item) ? (
                  <>
                    <PrintedQuestion item={item} />
                    <MeasureChoices item={item} choice={choice} readOnly={readOnly} onPick={pick} />
                  </>
                ) : (
                  <RaceChoices item={item} choice={choice} readOnly={readOnly} onChange={onChange} onPick={pick} />
                )}
                {status}
                {strip}
                {extras}
              </>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
