// A voter's own ♥ / 👎 on published guides (the comparison templates: party slates, editorial
// boards, advocacy guides). Private: kept in the voter's default guide for the election
// (Guide.metadata.guideRatings, keyed by template guide id), never sent to anyone else
// (toResponse strips it for non-owners) and never counted. Sharing them would need its own,
// clearly worded opt-in; shareCommunity (counting picks) is not that.
// In Quick view they only reorder and dim badges for this voter: hearted guides lead, disliked
// ones stay visible but greyed. They never change a stakes grade or a badge count.
import type { Badge } from './scorecard'

export type GuideRating = 'heart' | 'dislike'
export type GuideRatings = Record<string, GuideRating>

// Template guide ids are "cmp-<comparison id>" (prisma/seed.ts)
const TEMPLATE_ID = /^cmp-[a-z0-9-]{1,80}$/
export const MAX_RATINGS = 100

// The ratings stored on a guide's metadata (anything malformed is dropped)
export function ratingsOf(metadata: unknown): GuideRatings {
  const raw = metadata && typeof metadata === 'object' ? (metadata as { guideRatings?: unknown }).guideRatings : null
  return cleanRatings(raw) ?? {}
}

// A ratings map from a request body: null when it isn't one
export function cleanRatings(raw: unknown): GuideRatings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: GuideRatings = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!TEMPLATE_ID.test(id) || (value !== 'heart' && value !== 'dislike')) continue
    out[id] = value
    if (Object.keys(out).length >= MAX_RATINGS) break
  }
  return out
}

// The same map with one guide's rating set, changed or cleared (null)
export function withRating(ratings: GuideRatings, id: string, rating: GuideRating | null): GuideRatings {
  const next = { ...ratings }
  if (rating) next[id] = rating
  else delete next[id]
  return next
}

// Metadata without the private ratings, for anyone who isn't the guide's owner
export function withoutRatings(metadata: unknown): unknown {
  if (!metadata || typeof metadata !== 'object' || !('guideRatings' in metadata)) return metadata
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { guideRatings, ...rest } = metadata as Record<string, unknown>
  return rest
}

export type RatedBadge = Badge & { rating?: GuideRating }

// Hearted guides' badges first, then unrated, then disliked; order otherwise kept. Every badge
// stays (a dislike dims, it doesn't hide).
export function rankBadges(list: Badge[], ratings: GuideRatings): RatedBadge[] {
  const rank = (b: Badge) => {
    const r = b.guideId ? ratings[b.guideId] : undefined
    return r === 'heart' ? 0 : r === 'dislike' ? 2 : 1
  }
  return list
    .map((b, i) => ({ b, i, r: rank(b) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map(({ b }) => {
      const rating = b.guideId ? ratings[b.guideId] : undefined
      return rating ? { ...b, rating } : b
    })
}
