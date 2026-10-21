'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowDownToLine, Download, Eye, ListChecks, Printer, SkipForward, Vote } from 'lucide-react'
import Contest from '@/components/ballot/Contest'
import BallotNav from '@/components/ballot/BallotNav'
import ReviewSheet from '@/components/ballot/ReviewSheet'
import {
  choiceLabel,
  contestDomId,
  contestLabel,
  groupSections,
  type BallotItem,
  type ChoiceValue,
} from '@/components/ballot/ballot'
import { formatElectionDate } from '@/lib/format'

export type { BallotItem } from '@/components/ballot/ballot'

interface BallotTrackerProps {
  ballots: BallotItem[]
  guideTitle: string
  election: { id: string; title: string; electionDate: string; jurisdiction: { name: string } }
  choices: Record<string, ChoiceValue>
  readOnly?: boolean
  onChoiceChange?: (ballotId: string, selection: string, notes?: string) => void
  onChoiceClear?: (ballotId: string) => void
}

type Mode = 'ballot' | 'review'

// A guide laid out like a sample ballot (ovals, section bars, "vote for one"), plus what
// paper can't do: a contest navigator, jump-to-undecided, a review sheet, notes and links
export default function BallotTracker({
  ballots,
  guideTitle,
  election,
  choices,
  readOnly = false,
  onChoiceChange,
  onChoiceClear,
}: BallotTrackerProps) {
  const [mode, setMode] = useState<Mode>('ballot')
  const [activeId, setActiveId] = useState<string | null>(null)
  // Snapshot of contests decided when the filter was turned on, so a contest doesn't
  // vanish the moment you mark it
  const [hiddenIds, setHiddenIds] = useState<Set<string> | null>(null)

  const sections = useMemo(() => groupSections(ballots), [ballots])
  // Contests in the order they appear on the page (sections regroup by level)
  const pageOrder = useMemo(() => sections.flatMap((s) => s.items), [sections])
  const mobileNavRef = useRef<HTMLDetailsElement>(null)
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
    // The mobile contest list lives in the sticky toolbar; close it so it doesn't cover the contest
    if (mobileNavRef.current) mobileNavRef.current.open = false
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
  }, [mode, ballots, visibleSections])

  const nextUndecided = () => {
    const start = pageOrder.findIndex((b) => b.id === activeId)
    for (let step = 1; step <= pageOrder.length; step++) {
      const item = pageOrder[(start + step) % pageOrder.length]
      if (!choices[item.id]) return jumpTo(item.id)
    }
  }

  const handleExport = () => {
    const lines = [guideTitle, `${election.title} · ${formatElectionDate(election.electionDate)}`, '']
    for (const section of sections) {
      lines.push(section.label.toUpperCase())
      for (const ballot of section.items) {
        const choice = choices[ballot.id]
        lines.push(`  ${contestLabel(ballot)}: ${choice ? choiceLabel(choice.selection) : '(no choice)'}`)
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

  const toolButton = 'flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50'
  const nav = <BallotNav sections={sections} choices={choices} activeId={activeId} onJump={jumpTo} />

  return (
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside className="hidden lg:block print:hidden">
        <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">{nav}</div>
      </aside>

      <div className="min-w-0 space-y-6">
        <div className="sticky top-0 z-20 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-3 backdrop-blur print:hidden sm:mx-0 sm:rounded-lg sm:border">
          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-gray-800">
              {answered} of {ballots.length} contests decided
            </span>
            <span className="text-gray-500">{completionPercentage}%</span>
          </div>
          <div className="mb-3 h-2 w-full rounded-full bg-gray-200">
            <div className="h-2 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${completionPercentage}%` }} />
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm ${
                    mode === value ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
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
          <details ref={mobileNavRef} className="mt-3 lg:hidden">
            <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-blue-700">
              <ArrowDownToLine className="h-4 w-4" /> Jump to a contest
            </summary>
            <div className="mt-2 max-h-[50vh] overflow-y-auto">{nav}</div>
          </details>
        </div>

        <div id="ballot-top" className="scroll-mt-48 border-2 border-gray-900 bg-white">
          <div className="flex flex-wrap justify-between gap-x-4 bg-gray-900 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white">
            <span>Sample ballot · personal voter guide</span>
            <span>Not an official ballot</span>
          </div>
          <div className="px-4 py-5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-600">{election.jurisdiction.name}</p>
            <h2 className="mt-1 text-xl font-bold uppercase text-gray-900 sm:text-2xl">{election.title}</h2>
            <p className="mt-1 text-sm text-gray-700">{formatElectionDate(election.electionDate)}</p>
          </div>
          <div className="border-t-2 border-gray-900 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <span className="font-bold uppercase">Instructions: </span>
            {readOnly
              ? 'These are the choices recorded in this guide. Filled ovals show each pick.'
              : 'Fill in the oval next to your choice. Picks save as you go. Use this to plan — then mark the official ballot from your elections office.'}
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
          visibleSections.map((section) => (
            <section key={section.key} aria-label={section.label} className="space-y-4">
              <h3 className="bg-gray-900 px-4 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
                {section.label}
              </h3>
              {section.items.map((item) => (
                <Contest
                  key={item.id}
                  item={item}
                  electionId={election.id}
                  choice={choices[item.id]}
                  readOnly={readOnly}
                  onChange={(selection, notes) => onChoiceChange?.(item.id, selection, notes)}
                  onClear={() => onChoiceClear?.(item.id)}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  )
}
