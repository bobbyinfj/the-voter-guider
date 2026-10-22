'use client'

import { useCallback, useState } from 'react'
import { KIND_LABELS, type ComparisonKind, type Lean } from '@/lib/comparisons'

export interface ComparePick {
  selection: string
  source: string | null
  quote: string | null
}

export interface CompareGuide {
  id: string
  name: string
  kind: ComparisonKind
  lean?: Lean | null
  url: string
  retrieved: string
  about: string
  picks: Record<string, ComparePick>
}

export interface CommunityTally {
  sharers: number
  minimum: number
  contests: Record<string, { total: number; picks: Record<string, number> }>
}

export interface CompareData {
  guides: CompareGuide[]
  community: CommunityTally
}

// What's being compared right now: one or two published guides (party and advocacy guides
// always as a left/right pair), or the community tally
export interface CompareView {
  key: string
  label: string
  guides: CompareGuide[]
  community: CommunityTally | null
}

export interface CompareOption {
  key: string
  label: string
  group: string
}

const pairKinds: ComparisonKind[] = ['party', 'advocacy']

export function compareOptions(data: CompareData): CompareOption[] {
  const options: CompareOption[] = [{ key: 'community', label: 'Voter Guider users (community tally)', group: 'Community' }]
  for (const kind of pairKinds) {
    const pair = data.guides.filter((g) => g.kind === kind)
    if (pair.length >= 2) options.push({ key: kind, label: pair.map((g) => g.name).join(' & '), group: KIND_LABELS[kind] })
  }
  for (const g of data.guides.filter((g) => !pairKinds.includes(g.kind))) {
    options.push({ key: g.id, label: g.name, group: KIND_LABELS[g.kind] })
  }
  return options
}

export function compareView(data: CompareData, key: string): CompareView | null {
  if (key === 'community') return { key, label: 'Voter Guider users', guides: [], community: data.community }
  if (pairKinds.includes(key as ComparisonKind)) {
    // Left first, then right, always together
    const guides = data.guides
      .filter((g) => g.kind === key)
      .sort((a, b) => (a.lean === b.lean ? a.name.localeCompare(b.name) : a.lean === 'left' ? -1 : 1))
    return guides.length >= 2 ? { key, label: KIND_LABELS[key as ComparisonKind], guides, community: null } : null
  }
  const g = data.guides.find((x) => x.id === key)
  return g ? { key, label: g.name, guides: [g], community: null } : null
}

// Loads the election's comparison data the first time you open the picker
export function useCompareData(electionId: string) {
  const [data, setData] = useState<CompareData | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const load = useCallback(async () => {
    if (data || state === 'loading') return
    setState('loading')
    const res = await fetch(`/api/compare?electionId=${encodeURIComponent(electionId)}`).catch(() => null)
    if (res?.ok) {
      setData(await res.json())
      setState('idle')
    } else setState('error')
  }, [data, electionId, state])
  return { data, state, load }
}
