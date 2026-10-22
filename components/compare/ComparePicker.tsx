'use client'

import { ExternalLink, GitCompare } from 'lucide-react'
import { isPick, type BallotItem, type ChoiceValue } from '@/components/ballot/ballot'
import { compareOptions, compareView, useCompareData, type CompareView } from './compare'

// "Compare with…" in the guide toolbar, plus a one-line summary of where you agree
export default function ComparePicker({
  electionId,
  ballots,
  choices,
  view,
  onView,
}: {
  electionId: string
  ballots: BallotItem[]
  choices: Record<string, ChoiceValue>
  view: CompareView | null
  onView: (view: CompareView | null) => void
}) {
  const { data, state, load } = useCompareData(electionId)
  const options = data ? compareOptions(data) : []
  const groups = [...new Set(options.map((o) => o.group))]

  // Where you and each compared guide both picked, how often you match
  const agreement = view?.guides.map((g) => {
    const both = ballots.filter((b) => g.picks[b.id] && isPick(choices[b.id]?.selection))
    return { g, both: both.length, same: both.filter((b) => g.picks[b.id].selection === choices[b.id].selection).length }
  })

  return (
    <div className="mt-3 space-y-1.5">
      <label className="flex flex-wrap items-center gap-2 text-sm">
        <GitCompare className="h-4 w-4 text-gray-600" />
        <span className="font-medium text-gray-800">Compare with</span>
        <select
          value={view?.key ?? ''}
          onFocus={load}
          onMouseDown={load}
          onChange={(e) => onView(data && e.target.value ? compareView(data, e.target.value) : null)}
          className="min-w-0 max-w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">{state === 'loading' ? 'Loading…' : 'Nothing (just my picks)'}</option>
          {groups.map((group) => (
            <optgroup key={group} label={group}>
              {options
                .filter((o) => o.group === group)
                .map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        {state === 'error' && <span className="text-xs text-red-700">Couldn&apos;t load guides to compare.</span>}
      </label>
      {view && (
        <div className="text-xs text-gray-700">
          {view.community ? (
            <p>
              Anonymous totals from {view.community.sharers} Voter Guider{' '}
              {view.community.sharers === 1 ? 'user' : 'users'} who chose to share their picks. Not a poll or a
              prediction.
            </p>
          ) : (
            agreement?.map(({ g, both, same }) => (
              <p key={g.id}>
                <strong>{g.name}</strong>: {g.about}{' '}
                <a href={g.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 underline">
                  source <ExternalLink className="h-3 w-3" />
                </a>{' '}
                (retrieved {g.retrieved}).{' '}
                {both > 0 && (
                  <span>
                    You match on <strong>{same}</strong> of {both} contests you both picked.
                  </span>
                )}
              </p>
            ))
          )}
        </div>
      )}
    </div>
  )
}
