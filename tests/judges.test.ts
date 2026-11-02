import { test } from 'node:test'
import assert from 'node:assert/strict'
import { barRatingTie, isRatedJudgeRace, lawyerSince, type BallotItem } from '@/components/ballot/ballot'
import bundle from '../data/elections/ca-general-2026-11-03.json'
import enrichment from '../data/enrichment/ca-general-2026-11-03.json'

// A judicial race as the ballot sees it: each candidate's profile from the enrichment file
type Enriched = { guide?: { rating?: unknown }; bar?: unknown }
const race = (officeId: string): BallotItem => {
  const office = bundle.offices.find((o) => o.id === officeId)!
  const people = enrichment.candidates as Record<string, Enriched>
  return {
    id: `${officeId}-race`,
    type: 'candidate',
    office: {
      id: officeId,
      candidates: office.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        party: null,
        incumbent: false,
        profile: { barRating: people[c.id]?.guide?.rating ?? null, bar: people[c.id]?.bar ?? null } as never,
      })),
    },
  } as unknown as BallotItem
}

test('the bar rating separates candidates in Offices 64 and 87, and ties in 65 and 131', () => {
  assert.equal(barRatingTie(race('ca26-la-superior-64')), null)
  assert.equal(barRatingTie(race('ca26-la-superior-87')), null)
  assert.deepEqual(barRatingTie(race('ca26-la-superior-65')), { value: 'Qualified', by: 'Los Angeles County Bar Association' })
  assert.deepEqual(barRatingTie(race('ca26-la-superior-131'))?.value, 'Qualified')
  for (const id of ['ca26-la-superior-64', 'ca26-la-superior-65', 'ca26-la-superior-87', 'ca26-la-superior-131'])
    assert.ok(isRatedJudgeRace(race(id)), id)
  assert.equal(isRatedJudgeRace(race('ca26-treasurer')), false)
})

test('every Superior Court candidate gets a "lawyer since" year from the State Bar, or nobody in the race does', () => {
  const since = lawyerSince(race('ca26-la-superior-64'))!
  assert.deepEqual(since.get('MARIA GHOBADI'), { year: '2006', url: 'https://apps.calbar.ca.gov/attorney/Licensee/Detail/242945' })
  assert.equal(since.get('RHONDA A. HAYMON')?.year, '2001')
  const one = race('ca26-la-superior-65')
  ;(one.office!.candidates[0].profile as { bar: unknown }).bar = null
  assert.equal(lawyerSince(one), null)
})
