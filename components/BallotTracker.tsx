'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowDownToLine,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  ClipboardCopy,
  Columns3,
  GitCompare,
  Download,
  ExternalLink,
  Eye,
  ListChecks,
  ListOrdered,
  Printer,
  Rows3,
  SlidersHorizontal,
  SkipForward,
  Vote,
  X,
} from 'lucide-react'
import { type Density } from '@/components/ballot/Contest'
import BallotSheet from '@/components/ballot/BallotSheet'
import BallotNav from '@/components/ballot/BallotNav'
import ReviewSheet from '@/components/ballot/ReviewSheet'
import CompareSheet from '@/components/compare/CompareSheet'
import { byStakes, stakesOf } from '@/components/ballot/stakes'
import type { QuizOnBallot } from '@/lib/quiz/ballot'
import type { BadgeMap } from '@/lib/scorecard'
import { NotABallotStamp, PrintWatermark } from '@/components/Moleses'
import {
  contestDomId,
  resolveAnchor,
  groupRuns,
  groupSections,
  hasPrintedLayout,
  isPick,
  isSettled,
  isUnsure,
  NOTES_ONLY,
  layoutOf,
  layoutSourceName,
  type BallotItem,
  type ChoiceStatus,
  type SoftStatus,
  type ChoiceValue,
} from '@/components/ballot/ballot'
import { formatElectionDate } from '@/lib/format'

import { guideText, helpRequestText } from '@/components/ballot/export'
export type { BallotItem } from '@/components/ballot/ballot'

interface BallotTrackerProps {
  // In ballot order (see orderForBallot)
  ballots: BallotItem[]
  guideTitle: string
  election: { id: string; title: string; electionDate: string; jurisdiction: { name: string } }
  choices: Record<string, ChoiceValue>
  readOnly?: boolean
  // Someone else's guide, opened from its share link
  // Shown above the ballot, e.g. the district picker
  setup?: React.ReactNode
  // Right side of the view row, e.g. "Saved on this device"
  status?: React.ReactNode
  // Under the toolbar, e.g. the "keep your guide" prompt
  notice?: React.ReactNode
  onChoiceChange?: (ballotId: string, selection: string, notes?: string, status?: ChoiceStatus, marks?: Record<string, SoftStatus> | null) => void
  onChoiceClear?: (ballotId: string) => void
  onStatusChange?: (ballotId: string, status: ChoiceStatus) => void
  onCandidateNote?: (ballotId: string, name: string, text: string) => void
  // What your quiz answers matched in each race, by ballot id
  quiz?: Record<string, QuizOnBallot> | null
  // Published guides' picks, shown as badges in the Expanded view
  badges?: BadgeMap | null
}

// 'step': one contest at a time, in ballot order, with everything we know about it open
type Mode = 'ballot' | 'step' | 'review'
// Remembered for this browser tab only: every visit starts on Expanded
const DENSITY_KEY = 'voter-guider:view'
const ROOM_KEY = 'voter-guider:more-room'
const placeKey = (electionId: string) => `voter-guider:place:${electionId}`

// A guide laid out like the voter's own ballot (same contests, order and wording as the
// county's sample ballot), plus what paper can't do: notes, research, jump-to-undecided
export default function BallotTracker({
  ballots,
  guideTitle,
  election,
  choices,
  readOnly = false,
  setup,
  status,
  notice,
  onChoiceChange,
  onChoiceClear,
  onStatusChange,
  onCandidateNote,
  quiz,
  badges,
}: BallotTrackerProps) {
  const [mode, setMode] = useState<Mode>('ballot')
  const [view, setView] = useState<Density | 'compare'>('expanded')
  const density: Density = view === 'expanded' ? 'expanded' : 'basic'
  const [showFilters, setShowFilters] = useState(false)
  const [differOnly, setDifferOnly] = useState(false)
  const [coveredOnly, setCoveredOnly] = useState(false)
  const [byImportance, setByImportance] = useState(false)
  // Hides the outline and shrinks the toolbar to one line
  const [moreRoom, setMoreRoom] = useState(false)
  const [showViewHelp, setShowViewHelp] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  // Snapshot of contests decided when the filter was turned on, so a contest doesn't
  // vanish the moment you mark it
  const [hiddenIds, setHiddenIds] = useState<Set<string> | null>(null)
  const jumpMenuRef = useRef<HTMLDetailsElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Per-tab preference; storage can be unavailable (private mode), which is fine
  useEffect(() => {
    let saved: string | null = null
    try {
      saved = sessionStorage.getItem(DENSITY_KEY)
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only preference, read after hydration
    if (saved === 'expanded' || saved === 'basic' || saved === 'compare') setView(saved)
    try {
      if (localStorage.getItem(ROOM_KEY) === '1') setMoreRoom(true)
    } catch {}
  }, [])
  const toggleRoom = () => {
    setMoreRoom(!moreRoom)
    try {
      localStorage.setItem(ROOM_KEY, moreRoom ? '0' : '1')
    } catch {}
  }
  const chooseDensity = (value: Density | 'compare') => {
    setView(value)
    try {
      sessionStorage.setItem(DENSITY_KEY, value)
    } catch {}
  }
  // From a contest in the Ballot view: switch to Expanded and land on that contest
  const expandAt = (domId: string) => {
    flushSync(() => chooseDensity('expanded'))
    history.replaceState(null, '', `#${domId}`)
    const el = document.getElementById(domId)
    if (el) scrollToElement(el, 'auto')
  }
  const printedSections = useMemo(() => groupSections(ballots), [ballots])
  // Ballot order unless the reader asks for measures by importance, which only Expanded shows
  const sortedByImportance = view === 'expanded' && byImportance
  const sections = useMemo(
    () => (sortedByImportance ? byStakes(printedSections, badges) : printedSections),
    [printedSections, sortedByImportance, badges],
  )
  const hasGradedMeasures = useMemo(() => ballots.some((b) => stakesOf(b)), [ballots])
  // One step per contest as printed (retention questions under one heading are one step)
  const steps = useMemo(
    () => sections.flatMap((section) => groupRuns(section.items).map((run) => ({ section, run }))),
    [sections],
  )
  const [stepIndex, setStepIndex] = useState(0)
  const stepOf = (itemId: string) => Math.max(0, steps.findIndex((st) => st.run.some((i) => i.id === itemId)))
  const printed = hasPrintedLayout(ballots)
  const source = ballots[0] ? layoutOf(ballots[0])?.source : undefined
  const pageOrder = useMemo(() => sections.flatMap((s) => s.items), [sections])
  // A contest is done once it has a pick or is left blank on purpose; "no clue yet" is still to go
  const done = (id: string) => isSettled(choices[id])
  const answered = ballots.filter((b) => done(b.id)).length
  const leaning = ballots.filter((b) => isPick(choices[b.id]?.selection) && choices[b.id].status === 'tentative').length
  const unsure = ballots.filter((b) => isUnsure(choices[b.id])).length
  // Races where your quiz found a clear match and you haven't marked anything yet
  const quizPending = readOnly || !onChoiceChange ? [] : ballots.filter((b) => quiz?.[b.id]?.top && (!choices[b.id] || choices[b.id].selection === NOTES_ONLY))
  const quizMatched = Object.values(quiz ?? {}).filter((q) => q.top).length
  const completionPercentage = ballots.length > 0 ? Math.round((answered / ballots.length) * 100) : 0
  const visibleSections = useMemo(
    () =>
      hiddenIds
        ? sections
            .map((s) => ({ ...s, items: s.items.filter((i) => !hiddenIds.has(i.id)) }))
            .filter((s) => s.items.length > 0)
        : sections,
    [sections, hiddenIds],
  )

  // Scroll so the element's top sits just under the toolbar (sticky from the sm breakpoint up)
  const scrollToElement = (el: HTMLElement, behavior: ScrollBehavior) => {
    const bar = toolbarRef.current
    const covered = bar && getComputedStyle(bar).position === 'sticky' ? bar.offsetHeight : 0
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - covered - 8, behavior })
  }

  // Render the ballot view (and un-hide the contest) synchronously so it can be scrolled to.
  // The address bar follows, so you can copy a link to where you are.
  const jumpTo = (itemId: string) => {
    flushSync(() => {
      if (hiddenIds?.has(itemId)) setHiddenIds(null)
      setMode('ballot')
      setActiveId(itemId)
    })
    if (jumpMenuRef.current) jumpMenuRef.current.open = false
    const item = ballots.find((b) => b.id === itemId)
    const el = item && document.getElementById(contestDomId(item))
    if (!el) return
    history.replaceState(null, '', `#${contestDomId(item)}`)
    scrollToElement(el, 'smooth')
    el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus({ preventScroll: true })
  }

  // Arriving on a link to part of the ballot (#laccd-2, #laccd-2--roy-payan, or a group of
  // contests): show the ballot with nothing filtered out, scroll there once the layout has
  // settled (the saved view can switch to Ballot just after load), and highlight it briefly
  useEffect(() => {
    const timers: number[] = []
    const go = () => {
      const target = resolveAnchor(window.location.hash, ballots)
      if (!target) return
      flushSync(() => {
        setHiddenIds(null)
        setMode('ballot')
        setActiveId(target.itemIds[0])
      })
      const settle = (behavior: ScrollBehavior) => {
        const el = document.getElementById(target.elementId)
        if (el) scrollToElement(el, behavior)
      }
      settle('auto')
      timers.push(window.setTimeout(() => settle('auto'), 400))
      const lit = target.itemIds
        .map((id) => document.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`))
        .concat(target.elementId.includes('--') ? [document.getElementById(target.elementId)] : [])
        .filter((el): el is HTMLElement => !!el)
      lit.forEach((el) => el.classList.add('anchor-flash'))
      timers.push(window.setTimeout(() => lit.forEach((el) => el.classList.remove('anchor-flash')), 2500))
    }
    timers.push(window.setTimeout(go, 60))
    window.addEventListener('hashchange', go)
    return () => {
      timers.forEach(clearTimeout)
      window.removeEventListener('hashchange', go)
    }
  }, [ballots])

  // Highlight the contest currently in view in the navigator
  useEffect(() => {
    if (mode !== 'ballot') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        const id = visible[0]?.target.getAttribute('data-item-id')
        if (id) setActiveId(id)
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const item of ballots) {
      const el = document.getElementById(contestDomId(item))
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [mode, ballots, visibleSections, view])

  // Start (or continue) going through the ballot one contest at a time
  const goStep = (index: number) => {
    setMode('step')
    setStepIndex(Math.min(Math.max(index, 0), steps.length - 1))
    if (jumpMenuRef.current) jumpMenuRef.current.open = false
    // After the new contest renders, bring its top (just under the toolbar) into view
    window.setTimeout(() => {
      const el = document.getElementById('step-top')
      if (el) scrollToElement(el, 'auto')
    }, 0)
  }
  const firstUndecidedStep = (from: number) => {
    for (let k = 1; k <= steps.length; k++) {
      const index = (from + k) % steps.length
      if (steps[index].run.some((i) => !done(i.id))) return index
    }
    return from
  }
  // On arrival: ?view=step (the "Go through my ballot" link) opens on the first contest still to
  // decide, then leaves the address bar so a reload doesn't start over. Otherwise, unless a link
  // points somewhere, a reload or a trip back returns to where you were in this tab.
  useEffect(() => {
    if (!steps.length) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('view') === 'step') {
      url.searchParams.delete('view')
      history.replaceState(null, '', url)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the link's view, read after hydration
      goStep(firstUndecidedStep(steps.length - 1))
      return
    }
    if (url.hash) return
    let place: { mode?: Mode; itemId?: string } | null = null
    try {
      place = JSON.parse(sessionStorage.getItem(placeKey(election.id)) ?? 'null')
    } catch {}
    if (!place) return
    const itemId = place.itemId
    if (place.mode === 'step' && itemId) return goStep(stepOf(itemId))
    if (place.mode === 'review') return setMode('review')
    const item = ballots.find((b) => b.id === itemId)
    if (!item) return
    const timer = window.setTimeout(() => {
      const el = document.getElementById(contestDomId(item))
      if (el) scrollToElement(el, 'auto')
    }, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on arrival
  }, [steps.length])

  // Remember the mode and contest for this tab; the top of the ballot needs no remembering
  useEffect(() => {
    const itemId = mode === 'step' ? steps[stepIndex]?.run[0].id : activeId
    if (mode === 'ballot' && !itemId) return
    try {
      if (mode === 'ballot' && itemId === pageOrder[0]?.id) sessionStorage.removeItem(placeKey(election.id))
      else sessionStorage.setItem(placeKey(election.id), JSON.stringify({ mode, itemId }))
    } catch {}
  }, [mode, stepIndex, activeId, steps, pageOrder, election.id])

  const nextUndecided = () => {
    if (mode === 'step') return goStep(firstUndecidedStep(stepIndex))
    const start = pageOrder.findIndex((b) => b.id === activeId)
    for (let step = 1; step <= pageOrder.length; step++) {
      const item = pageOrder[(start + step) % pageOrder.length]
      if (!done(item.id)) return jumpTo(item.id)
    }
  }

  const exportInfo = () => ({
    guideTitle,
    electionTitle: election.title,
    date: formatElectionDate(election.electionDate),
    sections,
    choices,
  })

  const handleExport = () => {
    const blob = new Blob([guideText(exportInfo())], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-voter-guide.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Your picks, ?s and notes, with a request for help on the ones you're stuck on, to paste into an AI
  const [copied, setCopied] = useState<'yes' | 'failed' | null>(null)
  const handleCopyForAi = async () => {
    const text = helpRequestText({ ...exportInfo(), link: `${window.location.origin}/elections/${election.id}` })
    try {
      await navigator.clipboard.writeText(text)
      setCopied('yes')
    } catch {
      setCopied('failed')
    }
  }

  const toolButton =
    'flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50'
  const quietButton = 'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 hover:bg-gray-100'
  const segment = (active: boolean) =>
    `flex items-center gap-1 px-2 py-1.5 text-sm sm:gap-1.5 sm:px-3 ${active ? 'bg-ballot-bar text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`
  const activeFilters = (hiddenIds ? 1 : 0) + (view === 'compare' ? Number(differOnly) + Number(coveredOnly) : 0)
  const step = steps[stepIndex]
  const nav = (
    <BallotNav
      sections={sections}
      choices={choices}
      activeId={mode === 'step' ? step?.run[0].id ?? null : activeId}
      onJump={mode === 'step' ? (id) => goStep(stepOf(id)) : jumpTo}
    />
  )
  const showSidebar = !moreRoom && ((view === 'expanded' && mode === 'ballot') || mode === 'step')
  const toGo = ballots.length - answered
  const progress = (
    <>
      <span className="font-medium text-gray-800">
        {answered - leaning} decided{leaning > 0 && <>, {leaning} leaning</>} · {toGo} to go
        {unsure > 0 && <> ({unsure} not sure yet)</>}
      </span>
      {toGo > 0 && <span className="text-gray-500 max-sm:hidden" title="Our rough guess, at about a minute a contest">About {toGo} min left</span>}
    </>
  )

  return (
    <div className={showSidebar ? 'lg:grid lg:grid-cols-[clamp(15rem,27vw,28rem)_minmax(0,1fr)] lg:gap-8 print:block!' : ''}>
      <PrintWatermark />
      {showSidebar && (
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">{nav}</div>
        </aside>
      )}

      <div className="min-w-0 space-y-4">
        <div ref={toolbarRef} className={`z-20 -mx-4 border-b sm:sticky sm:top-0 border-gray-200 bg-gray-50/95 px-4 font-sans backdrop-blur print:hidden sm:mx-0 sm:rounded-lg sm:border ${moreRoom ? 'py-1.5' : 'py-2'}`}>
          {moreRoom ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {progress}
              <span className="ml-auto flex items-center gap-1">
                {!readOnly && (
                  <button onClick={nextUndecided} disabled={answered === ballots.length} className={quietButton}>
                    <SkipForward className="h-4 w-4" /> Next undecided
                  </button>
                )}
                <button onClick={toggleRoom} aria-pressed className={quietButton}>
                  <Minimize2 className="h-4 w-4" /> Show tools
                </button>
              </span>
            </div>
          ) : (
          <>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border border-gray-300">
                <button onClick={() => chooseDensity('basic')} aria-pressed={view === 'basic'} className={segment(view === 'basic')}>
                  <Columns3 className="h-4 w-4" /> Ballot<span className="max-sm:hidden"> view</span>
                </button>
                <button onClick={() => chooseDensity('expanded')} aria-pressed={view === 'expanded'} className={segment(view === 'expanded')}>
                  <Rows3 className="h-4 w-4" /> Expanded<span className="max-sm:hidden"> view</span>
                </button>
                <button onClick={() => chooseDensity('compare')} aria-pressed={view === 'compare'} className={segment(view === 'compare')}>
                  <GitCompare className="h-4 w-4" /> Compare<span className="max-sm:hidden"> view</span>
                </button>
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowViewHelp((v) => !v)}
                  aria-expanded={showViewHelp}
                  aria-controls="view-help"
                  aria-label="What do the views mean?"
                  className="rounded-full p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                >
                  <CircleHelp className="h-5 w-5" />
                </button>
                {showViewHelp && (
                  <div
                    id="view-help"
                    role="dialog"
                    aria-label="About the views"
                    className="absolute left-0 top-full z-30 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-lg sm:w-80"
                  >
                    <button
                      type="button"
                      onClick={() => setShowViewHelp(false)}
                      aria-label="Close"
                      className="absolute right-2 top-2 text-gray-400 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <p className="mb-2 pr-5">
                      <strong>Ballot view</strong> looks like your paper ballot: same contests, order and wording, in columns
                      (one column on a phone). Tap ⓘ on any contest for more.
                    </p>
                    <p className="mb-2">
                      <strong>Compare view</strong> puts your picks in a column beside up to four sources.
                    </p>
                    <p className="mb-2">
                      <strong>Expanded view</strong> puts the ballot on the left and a scorecard beside each name: a
                      video of them speaking, 🚩 flags, the 💩 meter (their PolitiFact record) and 🏅 badges from voter
                      guides, each with its source (<a href="/how-we-score" className="text-blue-700 underline">how we score</a>).
                      Measures get who says Yes and No, and the official explanations.
                    </p>
                    <p>
                      Click an oval once for <strong>leaning</strong> (striped), again for <strong>decided</strong> (filled),
                      again for <strong>possibly</strong> (~), again for <strong>not sure</strong> (?), and once more to clear it.
                      Leaning, possibly and not sure can go on several candidates while you compare; deciding on one clears
                      the rest. Tap <CircleHelp className="inline h-4 w-4 align-text-bottom" />{' '}
                      on a contest if you have no clue yet. Everything saves as you go.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {status}
              <button onClick={handleExport} aria-label="Download as text" className={quietButton}>
                <Download className="h-4 w-4" /> <span className="max-xl:hidden">Text</span>
              </button>
              <button onClick={() => window.print()} aria-label="Print" className={quietButton}>
                <Printer className="h-4 w-4" /> <span className="max-xl:hidden">Print</span>
              </button>
              <button onClick={toggleRoom} aria-pressed={false} className={quietButton} title="Hide the outline and shrink this toolbar">
                <Maximize2 className="h-4 w-4" /> More room
              </button>
            </div>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {progress}
            <div className="h-1.5 min-w-16 flex-1 rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-ballot-accent transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <span className="text-gray-500">{completionPercentage}%</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div role="tablist" aria-label="View" className="flex overflow-hidden rounded-md border border-gray-300">
              {([
                { value: 'ballot', label: 'Ballot', Icon: Vote },
                { value: 'step', label: 'One at a time', Icon: ListOrdered },
                { value: 'review', label: 'Review', Icon: Eye },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
                    // One at a time starts where you are on the ballot, not back at the first contest
                    if (value === 'step') return goStep(mode === 'step' ? stepIndex : activeId ? stepOf(activeId) : firstUndecidedStep(steps.length - 1))
                    setMode(value)
                    const top = document.getElementById('ballot-top')
                    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: 'start' })
                  }}
                  className={segment(mode === value)}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
            {!readOnly && (
              <button onClick={nextUndecided} disabled={answered === ballots.length} className={toolButton}>
                <SkipForward className="h-4 w-4" /> Next undecided
              </button>
            )}
            {mode === 'ballot' && (
              <button
                onClick={() => setShowFilters((f) => !f)}
                aria-expanded={showFilters}
                className={`${toolButton} ${activeFilters ? 'border-blue-400 bg-blue-50 text-blue-900' : ''}`}
              >
                <SlidersHorizontal className="h-4 w-4" /> Filters{activeFilters > 0 && ` (${activeFilters})`}
              </button>
            )}
            <button onClick={handleCopyForAi} className={toolButton} title="Copies your picks, ?s and notes, with a request for help on the contests you're stuck on">
              <ClipboardCopy className="h-4 w-4" /> Copy for an AI
            </button>
          </div>
          {copied && (
            <p role="status" className="mt-2 text-sm">
              {copied === 'yes' ? (
                <>
                  Copied your ballot, with the contests you&apos;re stuck on first. Paste it into{' '}
                  <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">
                    Claude ↗
                  </a>{' '}
                  or another AI. Its answers come from the AI, not the Voter Guider; check its sources.
                </>
              ) : (
                <>Your browser didn&apos;t allow copying. Use Text to download it instead.</>
              )}{' '}
              <button type="button" onClick={() => setCopied(null)} className="text-gray-500 underline">
                Dismiss
              </button>
            </p>
          )}
          {showFilters && mode === 'ballot' && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={hiddenIds !== null}
                  onChange={() => setHiddenIds((prev) => (prev ? null : new Set(ballots.filter((b) => done(b.id)).map((b) => b.id))))}
                />
                <ListChecks className="h-4 w-4 text-gray-500" /> Undecided only
              </label>
              {view === 'compare' && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={differOnly} onChange={() => setDifferOnly((d) => !d)} />
                  Only where a source differs from me
                </label>
              )}
              {view === 'compare' && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={coveredOnly} onChange={() => setCoveredOnly((c) => !c)} />
                  Only contests a source covers
                </label>
              )}
            </div>
          )}
          <details ref={jumpMenuRef} className={`mt-3 ${showSidebar ? 'lg:hidden' : ''}`}>
            <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-700">
              <ArrowDownToLine className="h-4 w-4" /> Jump to a contest
            </summary>
            <div className="mt-2 max-h-[50vh] overflow-y-auto sm:columns-2 lg:columns-3">{nav}</div>
          </details>
          </>
          )}
        </div>

        {notice}
        {quiz && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-4 border-violet-400 bg-violet-50 px-3 py-2 font-sans text-sm text-violet-950 print:hidden">
            <span>
              Quiz matches: {quizMatched} race{quizMatched === 1 ? '' : 's'}, shown beside each one.
              {quizPending.length > 0 &&
                (quizPending.length === 1 ? ' One of them isn’t marked yet.' : ` ${quizPending.length} of them aren’t marked yet.`)}
            </span>
            {quizPending.length > 0 && (
              <button
                type="button"
                onClick={() => quizPending.forEach((b) => onChoiceChange!(b.id, quiz[b.id].top!, choices[b.id]?.notes, 'unsure'))}
                className="rounded border border-violet-300 bg-white px-2 py-1 font-semibold hover:bg-violet-100"
              >
                Mark {quizPending.length === 1 ? 'it' : `all ${quizPending.length}`} as ? (not sure yet)
              </button>
            )}
          </div>
        )}
        {setup}

        <div id="ballot-top" className="scroll-mt-48 border-[1.5px] border-t-[6px] border-ballot-ink border-t-ballot-accent bg-ballot-paper">
          <NotABallotStamp readOnly={readOnly} />
          <div className="px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{election.jurisdiction.name}</p>
            <h2 className="mt-1 font-ballot-heading text-lg font-bold sm:text-xl">{election.title}</h2>
            <p className="text-sm text-gray-700">{formatElectionDate(election.electionDate)}</p>
          </div>
          <div className="border-t border-gray-300 bg-sky-50 px-4 py-2 text-xs text-sky-950 print:bg-white">
            {printed ? (
              <>
                Contests, order and wording are copied from {layoutSourceName(ballots)}
                {source && (
                  <>
                    {' '}
                    (
                    <a
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline"
                    >
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                    )
                  </>
                )}
                . Page and column breaks on your real ballot will differ. Blue boxes are our extras, not ballot text.
              </>
            ) : (
              <>
                We couldn&apos;t get this county&apos;s printed ballot layout, so contest order and wording here may
                differ from your real ballot. Blue boxes are our extras, not ballot text.
              </>
            )}
          </div>
          {mode === 'ballot' && view !== 'compare' && hasGradedMeasures && (
            <div className={`border-t border-gray-300 bg-amber-50 px-4 py-2 text-sm text-amber-950 print:bg-white ${sortedByImportance ? '' : 'print:hidden'}`}>
              {sortedByImportance ? (
                <>
                  Measures are sorted by importance here, not in ballot order.{' '}
                  <button type="button" onClick={() => setByImportance(false)} className="font-semibold underline print:hidden">
                    Back to ballot order
                  </button>
                </>
              ) : (
                <>
                  Short on time?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setByImportance(true)
                      chooseDensity('expanded')
                    }}
                    className="font-semibold underline"
                  >
                    Sort measures by importance
                  </button>{' '}
                  to see the biggest ones first.
                </>
              )}
            </div>
          )}
        </div>

        {mode === 'review' ? (
          <ReviewSheet sections={sections} choices={choices} readOnly={readOnly} onEdit={jumpTo} />
        ) : mode === 'step' && step ? (
          <div id="step-top" className="space-y-3">
            <StepBar
              index={stepIndex}
              total={steps.length}
              label={step.section.label}
              decided={step.run.every((i) => done(i.id))}
              onBack={() => goStep(stepIndex - 1)}
              onNext={() => goStep(stepIndex + 1)}
              onNextUndecided={readOnly ? undefined : () => goStep(firstUndecidedStep(stepIndex))}
              onReview={() => setMode('review')}
            />
            <BallotSheet
              sections={[{ ...step.section, items: step.run, continued: false, noBar: false }]}
              electionId={election.id}
              choices={choices}
              readOnly={readOnly}
              density="expanded"
              onChange={onChoiceChange}
              onClear={onChoiceClear}
              onStatus={onStatusChange}
              onCandidateNote={onCandidateNote}
              quiz={quiz}
              badges={badges}
            />
            <StepBar
              index={stepIndex}
              total={steps.length}
              decided={step.run.every((i) => done(i.id))}
              onBack={() => goStep(stepIndex - 1)}
              onNext={() => goStep(stepIndex + 1)}
              onNextUndecided={readOnly ? undefined : () => goStep(firstUndecidedStep(stepIndex))}
              onReview={() => setMode('review')}
            />
          </div>
        ) : mode === 'ballot' && view === 'compare' ? (
          <CompareSheet electionId={election.id} sections={visibleSections} choices={choices} differOnly={differOnly} coveredOnly={coveredOnly} onOpen={expandAt} />
        ) : visibleSections.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 bg-white p-6 text-center text-gray-600">
            Every contest has a choice.{' '}
            <button onClick={() => setHiddenIds(null)} className="text-blue-600 hover:underline">
              Show all
            </button>{' '}
            or switch to Review.
          </div>
        ) : (
          <BallotSheet
            sections={visibleSections}
            electionId={election.id}
            choices={choices}
            readOnly={readOnly}
            density={density}
            onChange={onChoiceChange}
            onClear={onChoiceClear}
            onStatus={onStatusChange}
            onCandidateNote={onCandidateNote}
            quiz={quiz}
            badges={badges}
            onExpand={expandAt}
          />
        )}
      </div>
    </div>
  )
}

// Above and below the contest in "One at a time": where you are, and the way on
function StepBar({
  index,
  total,
  label,
  decided,
  onBack,
  onNext,
  onNextUndecided,
  onReview,
}: {
  index: number
  total: number
  label?: string
  decided: boolean
  onBack: () => void
  onNext: () => void
  onNextUndecided?: () => void
  onReview: () => void
}) {
  const last = index === total - 1
  const base = 'inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium disabled:opacity-40'
  const button = `${base} border-gray-300 bg-white hover:bg-gray-50`
  const primary = `${base} border-ballot-ink bg-ballot-bar text-white hover:opacity-90`
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 font-sans print:hidden">
      <p className="text-sm text-gray-700">
        <strong>
          Contest {index + 1} of {total}
        </strong>
        {label && <span className="text-gray-500"> · {label}</span>}
        {decided && <span className="ml-2 text-green-700">✓ marked</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onBack} disabled={index === 0} className={button}>
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {onNextUndecided && (
          <button type="button" onClick={onNextUndecided} className={button}>
            <SkipForward className="h-4 w-4" /> Next undecided
          </button>
        )}
        {last ? (
          <button type="button" onClick={onReview} className={primary}>
            <Eye className="h-4 w-4" /> Review my ballot
          </button>
        ) : (
          <button type="button" onClick={onNext} className={primary}>
            Next <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
