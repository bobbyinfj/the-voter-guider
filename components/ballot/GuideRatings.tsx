'use client'

import { createContext, useContext } from 'react'
import { Heart, ThumbsDown } from 'lucide-react'
import type { GuideRating, GuideRatings } from '@/lib/guideRatings'
import type { BadgeMap } from '@/lib/scorecard'

// Your own ♥ / 👎 on published guides (lib/guideRatings.ts). Provided only on your own ballot;
// a shared guide (read-only) has no provider, so nobody's ratings show and nothing can be rated.
export const GuideRatingsContext = createContext<{ ratings: GuideRatings; onRate: (guideId: string, rating: GuideRating | null) => void } | null>(null)

export const useGuideRatings = () => useContext(GuideRatingsContext)

// Every published guide with a badge on this ballot, by template guide id
export function publishedGuides(badges: BadgeMap | null | undefined): { id: string; name: string; lean?: string | null }[] {
  const seen = new Map<string, { id: string; name: string; lean?: string | null }>()
  for (const bySelection of Object.values(badges ?? {}))
    for (const list of Object.values(bySelection))
      for (const b of list) if (b.guideId && !seen.has(b.guideId)) seen.set(b.guideId, { id: b.guideId, name: b.by, lean: b.lean })
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

// "Your take on the guides": a ♥ and a 👎 toggle per published guide. Quick view puts badges from
// guides you ♥ first and greys out the ones you 👎. Only you see them.
export default function GuideRatingsPanel({ badges }: { badges: BadgeMap | null | undefined }) {
  const ctx = useGuideRatings()
  const guides = publishedGuides(badges)
  if (!ctx || !guides.length) return null
  const { ratings, onRate } = ctx
  const rated = Object.keys(ratings).filter((id) => guides.some((g) => g.id === id)).length
  return (
    <details className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-sans text-sm print:hidden">
      <summary className="cursor-pointer select-none font-semibold text-gray-900">
        ♥ or 👎 the published guides{rated ? ` (${rated} rated)` : ''}
        <span className="ml-1 font-normal text-gray-600">· only you see this</span>
      </summary>
      <p className="mt-1 text-xs text-gray-600">
        In Quick view, badges from guides you ♥ come first and guides you 👎 are greyed out. It only changes what you see; it
        isn&apos;t shared or counted, and it doesn&apos;t change any stakes grade or badge count.
      </p>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {guides.map((g) => {
          const r = ratings[g.id]
          return (
            <li key={g.id} className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={r === 'heart'}
                aria-label={`Heart ${g.name}`}
                title={r === 'heart' ? 'Remove your ♥' : '♥ this guide'}
                onClick={() => onRate(g.id, r === 'heart' ? null : 'heart')}
                className={`rounded-full border p-1 ${r === 'heart' ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-gray-200 text-gray-400 hover:text-rose-500'}`}
              >
                <Heart className="h-3.5 w-3.5" fill={r === 'heart' ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                aria-pressed={r === 'dislike'}
                aria-label={`Dislike ${g.name}`}
                title={r === 'dislike' ? 'Remove your 👎' : '👎 this guide'}
                onClick={() => onRate(g.id, r === 'dislike' ? null : 'dislike')}
                className={`rounded-full border p-1 ${r === 'dislike' ? 'border-gray-500 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-400 hover:text-gray-700'}`}
              >
                <ThumbsDown className="h-3.5 w-3.5" fill={r === 'dislike' ? 'currentColor' : 'none'} />
              </button>
              <span className={`min-w-0 truncate text-xs ${r === 'dislike' ? 'text-gray-400' : 'text-gray-800'}`}>{g.name}</span>
            </li>
          )
        })}
      </ul>
    </details>
  )
}
