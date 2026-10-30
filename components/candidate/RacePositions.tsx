'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { isHttpUrl } from '@/lib/profile'
import type { BallotCandidate } from '@/components/ballot/ballot'

const quoted = (c: BallotCandidate, slug: string) =>
  c.stances?.some((s) => s.issue.slug === slug && s.sources.some((src) => isHttpUrl(src.url) && src.quote))

// "Where they stand" for one race: every topic some candidate here has a sourced position on,
// each in the source's own words. Nothing for a candidate who has no sourced position on it.
// One chip per topic (topics everyone here speaks to first); the first one's quotes show from the start.
export default function RacePositions({ people }: { people: BallotCandidate[] }) {
  const [chosen, setChosen] = useState<string | null>(null)
  const topics = new Map<string, string>()
  for (const c of people) for (const s of c.stances ?? []) topics.set(s.issue.slug, s.issue.name)
  if (!topics.size) return null
  const count = (slug: string) => people.filter((c) => quoted(c, slug)).length
  const ordered = [...topics].sort(([a], [b]) => count(b) - count(a))
  const [slug, name] = ordered.find(([key]) => key === chosen) ?? ordered[0]
  const none = people.filter((c) => !quoted(c, slug))
  return (
    <div className="space-y-1.5">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-sky-800">Where they stand, in their sources&apos; words</p>
      <div className="flex flex-wrap gap-1" role="group" aria-label="Pick a topic">
        {ordered.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setChosen(key)}
            aria-pressed={key === slug}
            className={`rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold ${
              key === slug ? 'border-blue-700 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 bg-white px-2 py-1.5">
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
        {none.length > 0 && <p className="mt-1 text-xs text-gray-500">No sourced position found for {none.map((c) => c.name).join(', ')}.</p>}
        <p className="mt-1 text-[0.6875rem]">
          <a href={`/issues/${slug}`} className="text-blue-700 hover:underline">
            Everyone on {name} →
          </a>
        </p>
      </div>
    </div>
  )
}
