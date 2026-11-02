import { test } from 'node:test'
import assert from 'node:assert/strict'
import { partyMembers, partySignals, type SignalRace } from '@/lib/partySignals'
import type { Badge, BadgeMap } from '@/lib/scorecard'

const race = (id: string, ...parties: (string | null)[]): SignalRace => ({
  id,
  type: 'candidate',
  office: { id: `office-${id}`, candidates: parties.map((party) => ({ party })) },
})
const badge = (kind: Badge['kind']): Badge => ({ by: kind, kind, label: kind, url: null })

test('party-only: every pick is a party or advocacy slate and the quiz cannot compare the race', () => {
  const badges: BadgeMap = {
    treasurer: { A: [badge('advocacy')], B: [badge('party'), badge('advocacy')] },
    mixed: { A: [badge('party')], B: [badge('editorial')] },
    quizzable: { A: [badge('party')] },
  }
  const s = partySignals([race('treasurer', 'Democratic', 'Republican'), race('mixed', 'Democratic', 'Republican'), race('quizzable', 'Democratic', 'Republican'), race('nobody', 'Democratic', 'Republican')], badges, new Set(['office-quizzable']))
  assert.deepEqual(s.treasurer, { partyOnly: true, sameParty: null })
  assert.equal(s.mixed, undefined, 'an editorial board picked here')
  assert.equal(s.quizzable, undefined, 'the quiz can compare it')
  assert.equal(s.nobody, undefined, 'no published picks at all is not "party only"')
})

test('same party: partisan races only', () => {
  const s = partySignals(
    [race('ic', 'Democratic', 'Democratic'), race('supt', 'Nonpartisan', 'Nonpartisan'), race('judge', null, null), race('npp', 'No Party Preference', 'No Party Preference'), race('split', 'Democratic', 'Republican')],
    {},
    new Set(),
  )
  assert.deepEqual(s.ic, { partyOnly: false, sameParty: 'Democratic' })
  assert.equal(s.supt, undefined)
  assert.equal(s.judge, undefined)
  assert.equal(s.npp, undefined)
  assert.equal(s.split, undefined)
  assert.equal(partyMembers('Democratic', 2), 'Both candidates are Democrats')
  assert.equal(partyMembers('Republican', 3), 'Every candidate is a Republican')
  assert.equal(partyMembers('Green', 2), 'Both candidates list their party preference as Green')
})

test('measures and one-candidate races never get a line', () => {
  const s = partySignals([{ id: 'm', type: 'measure', office: null }, race('solo', 'Democratic')], { m: { YES: [badge('party')] } }, new Set())
  assert.deepEqual(s, {})
})
