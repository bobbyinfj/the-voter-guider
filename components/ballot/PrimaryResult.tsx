import { ExternalLink } from 'lucide-react'
import { primaryFor, share } from '@/lib/results'

// Above the candidates in Expanded: each one's share of this year's primary, from the official results
export default function PrimaryResult({ officeId }: { officeId: string }) {
  const result = primaryFor(officeId)
  if (!result) return null
  const { race, election, publisher, url, retrieved } = result
  const rows = [...race.candidates.map((c) => ({ name: c.name, pct: share(c.votes, race.total) })), ...(race.others ? [{ name: 'Everyone else', pct: share(race.others, race.total) }] : [])]
  return (
    <div className="border-t border-sky-200 px-3 py-2">
      <p className="mb-1 text-xs font-semibold">How the {election} went</p>
      <ul className="space-y-1 text-xs">
        {rows.map((r) => (
          <li key={r.name} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_3rem] items-center gap-2">
            <span className="truncate" title={r.name}>{r.name}</span>
            <span className="h-2 rounded-full bg-sky-100">
              <span className="block h-2 rounded-full bg-sky-600" style={{ width: `${r.pct}%` }} />
            </span>
            <span className="text-right tabular-nums">{r.pct}%</span>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[0.6875rem] text-gray-600">
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
          {publisher} <ExternalLink className="h-2.5 w-2.5" />
        </a>{' '}
        (retrieved {retrieved}). Who voted then, not a forecast: fewer people vote in primaries.
      </p>
    </div>
  )
}
