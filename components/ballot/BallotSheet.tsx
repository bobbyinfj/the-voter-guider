'use client'

import { Fragment } from 'react'
import Contest, { type Density } from './Contest'
import type { CompareView } from '@/components/compare/compare'
import { contestGroups, groupRuns, type BallotSection, type ChoiceStatus, type ChoiceValue } from './ballot'

// The contests themselves, in printed sections and columns. Used by the guide (BallotTracker)
// and, read-only, as the ballot preview on the election page.
export default function BallotSheet({
  sections,
  electionId,
  choices = {},
  readOnly = false,
  density = 'basic',
  onChange,
  onClear,
  onStatus,
  compare,
}: {
  sections: BallotSection[]
  electionId: string
  choices?: Record<string, ChoiceValue>
  readOnly?: boolean
  density?: Density
  onChange?: (itemId: string, selection: string, notes?: string, status?: ChoiceStatus) => void
  onClear?: (itemId: string) => void
  onStatus?: (itemId: string, status: ChoiceStatus) => void
  compare?: CompareView | null
}) {
  // A link target before the first contest of each group (#los-angeles-community-college-district)
  const groups = [...contestGroups(sections.flatMap((s) => s.items))]
  const groupStarts = new Map(groups.map(([key, g]) => [g.items[0].id, key]))
  const groupOf = new Map(
    groups.flatMap(([key, g]) => g.items.map((i) => [i.id, { id: key, label: g.label, count: g.items.length }] as const)),
  )
  return (
    <div className={density === 'basic' ? 'gap-2 md:columns-2 lg:columns-3 print:columns-3' : 'mx-auto max-w-6xl'}>
      {sections.map((section) => (
        <section key={section.key} aria-label={section.label} className="contents">
          {section.notice && (
            <p className="mb-2 break-inside-avoid border-[1.5px] border-ballot-ink bg-ballot-paper px-2 py-1.5 text-[12px] font-bold leading-snug">
              {section.notice}
            </p>
          )}
          {section.continued || section.noBar ? (
            <h3 className="sr-only">{section.label}</h3>
          ) : (
            <h3 className="break-inside-avoid break-after-avoid bg-ballot-bar px-2 py-1 font-ballot-heading text-[13px] font-bold text-white print:bg-black">
              {section.label}
            </h3>
          )}
          {section.subsection && (
            <p className="break-inside-avoid break-after-avoid border-x-[1.5px] border-t-[1.5px] border-ballot-ink bg-ballot-sub px-2 py-1 text-[13px] font-bold">
              {section.subsection}
            </p>
          )}
          {groupRuns(section.items).map((run) => (
            <Fragment key={run[0].id}>
            {groupStarts.has(run[0].id) && <span id={groupStarts.get(run[0].id)} aria-hidden className="block h-0" />}
            <Contest
              run={run}
              electionId={electionId}
              choices={choices}
              readOnly={readOnly}
              density={density}
              onChange={(id, selection, notes, status) => onChange?.(id, selection, notes, status)}
              onClear={(id) => onClear?.(id)}
              onStatus={onStatus}
              compare={compare}
              linkGroup={groupOf.get(run[0].id)}
            />
            </Fragment>
          ))}
          <div aria-hidden className="h-3" />
        </section>
      ))}
    </div>
  )
}
