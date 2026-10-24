import { ExternalLink } from 'lucide-react'
import { isHttpUrl } from '@/lib/profile'
import type { BallotCandidate } from '@/components/ballot/ballot'

// "Where they stand" for one race: every topic some candidate here has a sourced position on,
// each in the source's own words. Nothing for a candidate who has no sourced position on it.
export default function RacePositions({ people }: { people: BallotCandidate[] }) {
  const topics = new Map<string, string>()
  for (const c of people) for (const s of c.stances ?? []) topics.set(s.issue.slug, s.issue.name)
  if (!topics.size) return null
  return (
    <div className="space-y-2">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-sky-800">Where they stand, in their sources&apos; words</p>
      {[...topics].map(([slug, name]) => (
        <div key={slug} className="rounded border border-sky-200 bg-white p-2">
          <p className="mb-1 text-xs font-semibold">
            <a href={`/issues/${slug}`} className="text-blue-700 hover:underline">
              {name}
            </a>
          </p>
          <ul className="space-y-1.5">
            {people.map((c) => {
              const stance = c.stances?.find((s) => s.issue.slug === slug)
              const source = stance?.sources.find((src) => isHttpUrl(src.url) && src.quote)
              if (!stance || !source) return null
              return (
                <li key={c.id} className="text-xs leading-snug">
                  <span className="font-semibold">{c.name}:</span> “{source.quote}”{' '}
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-blue-700 underline">
                    {source.title ?? 'Source'} <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
              )
            })}
          </ul>
          {(() => {
            const none = people.filter((c) => !c.stances?.some((s) => s.issue.slug === slug && s.sources.some((src) => isHttpUrl(src.url) && src.quote)))
            return none.length ? (
              <p className="mt-1 text-xs text-gray-500">No sourced position found for {none.map((c) => c.name).join(', ')}.</p>
            ) : null
          })()}
        </div>
      ))}
    </div>
  )
}
