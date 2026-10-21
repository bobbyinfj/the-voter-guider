'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowDownToLine,
  Columns3,
  Download,
  ExternalLink,
  Eye,
  ListChecks,
  Printer,
  Rows3,
  SkipForward,
  Vote,
} from 'lucide-react'
import Contest, { type Density } from '@/components/ballot/Contest'
import BallotNav from '@/components/ballot/BallotNav'
import ReviewSheet from '@/components/ballot/ReviewSheet'
import { NotABallotStamp, PrintWatermark } from '@/components/Molesis'
import {
  choiceLabel,
  contestDomId,
  contestLabel,
  groupRuns,
  groupSections,
  hasPrintedLayout,
  layoutOf,
  type BallotItem,
  type ChoiceValue,
} from '@/components/ballot/ballot'
import { formatElectionDate } from '@/lib/format'

export type { BallotItem } from '@/components/ballot/ballot'

interface BallotTrackerProps {
  // In ballot order (see orderForBallot)
  ballots: BallotItem[]
  guideTitle: string
  election: { id: string; title: string; electionDate: string; jurisdiction: { name: string } }
  choices: Record<string, ChoiceValue>
  readOnly?: boolean
  // Shown above the ballot, e.g. the district picker
  setup?: React.ReactNode
  onChoiceChange?: (ballotId: string, selection: string, notes?: string) => void
  onChoiceClear?: (ballotId: string) => void
}

type Mode = 'ballot' | 'review'
const DENSITY_KEY = 'voter-guider:ballot-density'

// A guide laid out like the voter's own ballot (same contests, order and wording as the
// county's sample ballot), plus what paper can't do: notes, research, jump-to-undecided
export default function BallotTracker({
  ballots,
  guideTitle,
  election,
  choices,
  readOnly = false,
  setup,
  onChoiceChange,
  onChoiceClear,
}: BallotTrackerProps) {
  const [mode, setMode] = useState<Mode>('ballot')
  const [density, setDensity] = useState<Density>('ballot')
  const [activeId, setActiveId] = useState<string | null>(null)
  // Snapshot of contests decided when the filter was turned on, so a contest doesn't
  // vanish the moment you mark it
  const [hiddenIds, setHiddenIds] = useState<Set<string> | null>(null)
  const jumpMenuRef = useRef<HTMLDetailsElement>(null)

  // Per-viewer preference; storage can be unavailable (private mode), which is fine
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DENSITY_KEY)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only preference, read after hydration
      if (saved === 'easy' || saved === 'ballot') setDensity(saved)
    } catch {}
  }, [])
  const chooseDensity = (value: Density) => {
    setDensity(value)
    try {
      localStorage.setItem(DENSITY_KEY, value)
    } catch {}
  }

  const sections = useMemo(() => groupSections(ballots), [ballots])
  const printed = hasPrintedLayout(ballots)
  const source = ballots[0] ? layoutOf(ballots[0])?.source : undefined
  const pageOrder = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const answered = ballots.filter((b) => choices[b.id]).length
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

  // Render the ballot view (and un-hide the contest) synchronously so it can be scrolled to
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
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.querySelector<HTMLInputElement>('input:not([disabled])')?.focus({ preventScroll: true })
  }

  // Highlight the contest currently in view in the navigator
  useEffect(() => {
    if (mode !== 'ballot') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length) setActiveId(visible[0].target.id.replace(/^contest-/, ''))
      },
      { rootMargin: '-25% 0px -65% 0px' },
    )
    for (const item of ballots) {
      const el = document.getElementById(contestDomId(item))
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [mode, ballots, visibleSections, density])

  const nextUndecided = () => {
    const start = pageOrder.findIndex((b) => b.id === activeId)
    for (let step = 1; step <= pageOrder.length; step++) {
      const item = pageOrder[(start + step) % pageOrder.length]
      if (!choices[item.id]) return jumpTo(item.id)
    }
  }

  const handleExport = () => {
    const lines = [guideTitle, `${election.title} · ${formatElectionDate(election.electionDate)}`]
    lines.push('Practice copy from the Voter Guider (unofficial). Not a ballot.', '')
    for (const section of sections) {
      lines.push(section.label.toUpperCase())
      for (const ballot of section.items) {
        const choice = choices[ballot.id]
        lines.push(`  ${contestLabel(ballot)}: ${choice ? choiceLabel(choice.selection, ballot) : '(no choice)'}`)
        if (choice?.notes) lines.push(`    Notes: ${choice.notes}`)
      }
      lines.push('')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'my-voter-guide.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const toolButton =
    'flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50'
  const segment = (active: boolean) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-sm ${active ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`
  const nav = <BallotNav sections={sections} choices={choices} activeId={activeId} onJump={jumpTo} />
  const showSidebar = density === 'easy' && mode === 'ballot'

  return (
    <div className={showSidebar ? 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8' : ''}>
      <PrintWatermark />
      {showSidebar && (
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">{nav}</div>
        </aside>
      )}

      <div className="min-w-0 space-y-4">
        <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur print:hidden sm:mx-0 sm:rounded-lg sm:border">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-gray-800">
              {answered} of {ballots.length} decided
            </span>
            <span className="text-gray-500">{completionPercentage}%</span>
          </div>
          <div className="mb-3 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div role="tablist" aria-label="View" className="flex overflow-hidden rounded-md border border-gray-300">
              {([
                { value: 'ballot', label: 'Ballot', Icon: Vote },
                { value: 'review', label: 'Review', Icon: Eye },
              ] as const).map(({ value, label, Icon }) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={mode === value}
                  onClick={() => {
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
            {mode === 'ballot' && (
              <div role="group" aria-label="Layout" className="hidden overflow-hidden rounded-md border border-gray-300 md:flex">
                <button
                  onClick={() => chooseDensity('ballot')}
                  aria-pressed={density === 'ballot'}
                  className={segment(density === 'ballot')}
                >
                  <Columns3 className="h-4 w-4" /> Like my ballot
                </button>
                <button
                  onClick={() => chooseDensity('easy')}
                  aria-pressed={density === 'easy'}
                  className={segment(density === 'easy')}
                >
                  <Rows3 className="h-4 w-4" /> Easy read
                </button>
              </div>
            )}
            {!readOnly && (
              <button onClick={nextUndecided} disabled={answered === ballots.length} className={toolButton}>
                <SkipForward className="h-4 w-4" /> Next undecided
              </button>
            )}
            {mode === 'ballot' && (
              <button
                onClick={() =>
                  setHiddenIds((prev) => (prev ? null : new Set(ballots.filter((b) => choices[b.id]).map((b) => b.id))))
                }
                aria-pressed={hiddenIds !== null}
                className={`${toolButton} ${hiddenIds ? 'border-blue-400 bg-blue-50 text-blue-900' : ''}`}
              >
                <ListChecks className="h-4 w-4" /> {hiddenIds ? 'Showing undecided' : 'Undecided only'}
              </button>
            )}
            <button onClick={handleExport} className={toolButton}>
              <Download className="h-4 w-4" /> Text
            </button>
            <button onClick={() => window.print()} className={toolButton}>
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>
          <details ref={jumpMenuRef} className={`mt-3 ${showSidebar ? 'lg:hidden' : ''}`}>
            <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-700">
              <ArrowDownToLine className="h-4 w-4" /> Jump to a contest
            </summary>
            <div className="mt-2 max-h-[50vh] overflow-y-auto sm:columns-2 lg:columns-3">{nav}</div>
          </details>
        </div>

        {setup}

        <div id="ballot-top" className="scroll-mt-48 border-[1.5px] border-gray-900 bg-white">
          <NotABallotStamp readOnly={readOnly} />
          <div className="px-4 py-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{election.jurisdiction.name}</p>
            <h2 className="mt-1 text-lg font-bold text-gray-900 sm:text-xl">{election.title}</h2>
            <p className="text-sm text-gray-700">{formatElectionDate(election.electionDate)}</p>
          </div>
          <div className="border-t border-gray-300 bg-sky-50 px-4 py-2 text-xs text-sky-950 print:bg-white">
            {printed ? (
              <>
                Contests, order and wording are copied from the county&apos;s official sample ballot
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
        </div>

        {mode === 'review' ? (
          <ReviewSheet sections={sections} choices={choices} readOnly={readOnly} onEdit={jumpTo} />
        ) : visibleSections.length === 0 ? (
          <div className="border-2 border-dashed border-gray-300 bg-white p-6 text-center text-gray-600">
            Every contest has a choice.{' '}
            <button onClick={() => setHiddenIds(null)} className="text-blue-600 hover:underline">
              Show all
            </button>{' '}
            or switch to Review.
          </div>
        ) : (
          <div className={density === 'ballot' ? 'gap-2 md:columns-2 xl:columns-3 print:columns-3' : 'mx-auto max-w-2xl'}>
            {visibleSections.map((section) => (
              <section key={section.key} aria-label={section.label} className="contents">
                {section.notice && (
                  <p className="mb-2 break-inside-avoid border-[1.5px] border-gray-900 bg-white px-2 py-1.5 text-[12px] font-bold leading-snug text-gray-900">
                    {section.notice}
                  </p>
                )}
                {section.continued ? (
                  <h3 className="sr-only">{section.label}</h3>
                ) : (
                  <h3 className="break-inside-avoid break-after-avoid bg-gray-900 px-2 py-1 text-[13px] font-bold text-white print:bg-black">
                    {section.label}
                  </h3>
                )}
                {section.subsection && (
                  <p className="break-inside-avoid break-after-avoid border-x-[1.5px] border-t-[1.5px] border-gray-900 bg-gray-300 px-2 py-1 text-[13px] font-bold">
                    {section.subsection}
                  </p>
                )}
                {groupRuns(section.items).map((run) => (
                  <Contest
                    key={run[0].id}
                    run={run}
                    electionId={election.id}
                    choices={choices}
                    readOnly={readOnly}
                    density={density}
                    onChange={(id, selection, notes) => onChoiceChange?.(id, selection, notes)}
                    onClear={(id) => onChoiceClear?.(id)}
                  />
                ))}
                <div aria-hidden className="h-3" />
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
