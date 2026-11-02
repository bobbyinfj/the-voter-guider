// When party is all a voter has to go on, say so (PRD S-1, from the down-ballot case study).
// Two plain facts per race, each true by a written rule that's the same for every race:
//   partyOnly: every published pick in the race comes from a party or advocacy slate, and the
//              quiz can't compare these candidates (fewer than MIN_SHARED_QUESTIONS shared
//              sourced positions, from the stance data, not anyone's answers)
//   sameParty: every candidate has the same party preference on the ballot, so party can't
//              separate them (partisan races only; never "Nonpartisan" or "No Party Preference")
// Nothing here recommends anyone; it only says where our signals run out.
import type { BadgeMap } from './scorecard'

export interface PartySignal {
  partyOnly: boolean
  // The shared party preference, as printed (e.g. "Democratic"), when everyone has the same one
  sameParty: string | null
}

export interface SignalRace {
  id: string
  type: string
  office?: { id: string; candidates: { party: string | null }[] } | null
}

const PARTY_KINDS = new Set(['party', 'advocacy'])
const NOT_A_PARTY = /^(non-?partisan|no party preference|none|unaffiliated)$/i

export function partySignals(races: SignalRace[], badges: BadgeMap | null | undefined, decidable: Set<string>): Record<string, PartySignal> {
  const out: Record<string, PartySignal> = {}
  for (const race of races) {
    const office = race.office
    if (race.type !== 'candidate' || !office || office.candidates.length < 2) continue
    const picks = Object.values(badges?.[race.id] ?? {}).flat()
    const partyOnly = picks.length > 0 && picks.every((b) => PARTY_KINDS.has(b.kind)) && !decidable.has(office.id)
    const parties = office.candidates.map((c) => c.party?.trim() ?? '')
    const shared = parties[0]
    const sameParty = shared && !NOT_A_PARTY.test(shared) && parties.every((p) => p === shared) ? shared : null
    if (partyOnly || sameParty) out[race.id] = { partyOnly, sameParty }
  }
  return out
}

// "Democrats", "Republicans"; anything else is described by its printed preference
export function partyMembers(party: string, count: number): string {
  const plural: Record<string, string> = { Democratic: 'Democrats', Republican: 'Republicans' }
  const word = plural[party]
  if (word) return count === 2 ? `Both candidates are ${word}` : `Every candidate is a ${word.slice(0, -1)}`
  return `${count === 2 ? 'Both candidates list' : 'Every candidate lists'} their party preference as ${party}`
}
