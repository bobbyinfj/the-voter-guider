import { stakesFor } from '@/lib/stakes'
import { layoutOf, levelOf, type BallotItem, type BallotSection } from './ballot'

// The facts stakesFor needs, from a ballot item and the published guides' Yes/No picks on it
export function stakesOf(item: BallotItem, badges?: Record<string, unknown[]>) {
  return stakesFor({
    id: item.id,
    type: item.type,
    level: levelOf(item),
    question: layoutOf(item)?.question,
    split: !!badges?.YES?.length && !!badges?.NO?.length,
  })
}

// Each section's measures, biggest stakes first (a stable sort, so ties keep ballot order). Candidate
// races and retention questions have no grade and stay after them, in order.
export function byStakes(sections: BallotSection[], badges?: Record<string, Record<string, unknown[]>> | null): BallotSection[] {
  const score = (item: BallotItem) => stakesOf(item, badges?.[item.id])?.score ?? -1
  return sections.map((s) => (s.items.some((i) => stakesOf(i)) ? { ...s, items: [...s.items].sort((a, b) => score(b) - score(a)) } : s))
}
