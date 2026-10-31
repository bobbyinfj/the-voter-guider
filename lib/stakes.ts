import data from '../data/measures/stakes.json'

// How much is riding on a measure, by a written rule that never looks at its topic or at which side
// is right (explained at /how-we-score#stakes). Dollars come from data/measures/stakes.json, each with
// the official words it rests on (a test checks them against the bundle).
interface StakesMoney {
  band: number
  quote: string
  plain: string
  // Where the quote is, when it isn't in the bundle's own text (Blue Book, voters' pamphlet)
  source?: string
}

const MONEY: Record<string, StakesMoney> = data

export type StakesGrade = 'High' | 'Medium' | 'Lower'

export interface MeasureFacts {
  id: string
  type: string
  level?: string | null
  // The official ballot wording
  question?: string
  // Published guides on both sides
  split: boolean
}

export interface Stakes {
  grade: StakesGrade
  score: number
  money: StakesMoney | null
  locked: boolean
  split: boolean
  local: boolean
}

// Retention questions are about one judge, so they get no grade
export function stakesFor(m: MeasureFacts): Stakes | null {
  if (m.type === 'retention') return null
  const money = MONEY[m.id] ?? null
  const locked = /constitutional amendment|amendment to the [a-z ]*constitution|charter amendment|amending the [a-z ]*charter/i.test(m.question ?? '')
  const local = !!m.level && m.level !== 'state'
  const score = (money?.band ?? 0) + (locked ? 2 : 0) + (m.split ? 1 : 0) + (local ? 1 : 0)
  return { grade: score >= 4 || money?.band === 3 ? 'High' : score >= 2 ? 'Medium' : 'Lower', score, money, locked, split: m.split, local }
}
