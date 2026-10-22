'use client'

import { ExternalLink } from 'lucide-react'
import { choiceLabel, type BallotItem, type ChoiceValue } from '@/components/ballot/ballot'
import type { CompareView } from './compare'

// Under a contest: what the guide(s) you're comparing with picked, each with its source, or the
// community tally. Not ballot text, so it's drawn as a Voter Guider extra.
export default function CompareStrip({ item, view, mine }: { item: BallotItem; view: CompareView; mine?: ChoiceValue }) {
  if (view.community) {
    const c = view.community.contests[item.id]
    return (
      <div className="border-l-2 border-sky-400 bg-sky-50 px-2 py-1.5 font-sans text-xs text-sky-950 print:hidden">
        {c ? (
          <>
            <p className="mb-1 font-semibold">
              Voter Guider users who shared their picks ({c.total}). Not a poll.
            </p>
            <ul className="space-y-0.5">
              {Object.entries(c.picks)
                .sort((a, b) => b[1] - a[1])
                .map(([selection, n]) => (
                  <li key={selection} className="flex items-center gap-2">
                    <span className="h-1.5 rounded bg-sky-500" style={{ width: `${Math.max(4, (n / c.total) * 96)}px` }} />
                    <span className={mine?.selection === selection ? 'font-semibold' : ''}>
                      {selection === 'WRITE-IN' ? 'Write-ins' : choiceLabel(selection, item)} · {Math.round((n / c.total) * 100)}%
                    </span>
                  </li>
                ))}
            </ul>
          </>
        ) : (
          <p>
            Fewer than {view.community.minimum} people have shared a pick here yet, so we don&apos;t show a tally.
          </p>
        )}
      </div>
    )
  }

  // Nothing to compare in this contest
  if (!view.guides.some((g) => g.picks[item.id])) return null
  return (
    <div className="space-y-1 border-l-2 border-sky-400 bg-sky-50 px-2 py-1.5 font-sans text-xs text-sky-950 print:hidden">
      {view.guides.map((g) => {
        const p = g.picks[item.id]
        const same = p && mine?.selection === p.selection
        return (
          <p key={g.id}>
            <span className="font-semibold">{g.name}:</span>{' '}
            {p ? (
              <>
                <span className={same ? 'font-semibold text-green-800' : ''}>{choiceLabel(p.selection, item)}</span>
                {same && ' (same as you)'}
                {p.source && (
                  <>
                    {' · '}
                    <a
                      href={p.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={p.quote ?? undefined}
                      className="inline-flex items-center gap-0.5 text-blue-700 underline"
                    >
                      source <ExternalLink className="h-3 w-3" />
                    </a>
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-600">no pick in the source we used</span>
            )}
          </p>
        )
      })}
    </div>
  )
}
