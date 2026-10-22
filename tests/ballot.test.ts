import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  candidateDomId,
  choiceLabel,
  contestDomId,
  openingSentence,
  resolveAnchor,
  groupRuns,
  groupSections,
  hasPrintedLayout,
  isPick,
  isSettled,
  isUnsure,
  orderForBallot,
  type BallotItem,
  type PrintedLayout,
} from '@/components/ballot/ballot'

const style = { party: 'below', responses: 'stacked' } as const
const layout = (order: number, section: string, extra: Partial<PrintedLayout> = {}): PrintedLayout => ({
  source: 'https://example.gov/sample.pdf',
  style,
  order,
  section,
  heading: [`Contest ${order}`],
  instructions: [],
  ...extra,
})
const item = (id: string, type: string, metadata: Record<string, unknown>, extra: Partial<BallotItem> = {}): BallotItem => ({
  id,
  title: id,
  type,
  metadata,
  ...extra,
})

test('orderForBallot follows the printed order when every item has a layout', () => {
  const items = [
    item('race', 'candidate', { ballot: layout(500, 'Federal') }),
    item('measure', 'initiative', { ballot: layout(100, 'State') }),
  ]
  assert.deepEqual(orderForBallot(items).map((i) => i.id), ['measure', 'race'])
  assert.equal(hasPrintedLayout(items), true)
})

test('orderForBallot falls back to races by sortOrder, then measures by level and number', () => {
  const items = [
    item('city-measure', 'measure', { level: 'city' }, { number: 'A' }),
    item('prop-10', 'measure', { level: 'state' }, { number: 'Prop 10' }),
    item('prop-2', 'measure', { level: 'state' }, { number: 'Prop 2' }),
    item('governor', 'candidate', { level: 'state', sortOrder: 20 }),
    item('us-house', 'candidate', { level: 'federal', sortOrder: 10 }),
  ]
  assert.deepEqual(orderForBallot(items).map((i) => i.id), ['us-house', 'governor', 'prop-2', 'prop-10', 'city-measure'])
  assert.equal(hasPrintedLayout(items), false)
})

test('groupSections keeps printed headings, marks continued subsections and shows a notice once', () => {
  const notice = 'READ: Each candidate for partisan office may state a political party...'
  const items = [
    item('ip', 'initiative', { ballot: layout(1, 'State', { subsection: 'Initiative to the People' }) }),
    item('il', 'initiative', { ballot: layout(2, 'State', { subsection: 'Initiatives to the Legislature' }) }),
    item('house', 'candidate', { ballot: layout(3, 'Federal', { notice }) }),
    item('senate', 'candidate', { ballot: layout(4, 'State', { notice }) }),
  ]
  const sections = groupSections(items)
  assert.deepEqual(sections.map((s) => [s.label, s.subsection ?? null, !!s.continued]), [
    ['State', 'Initiative to the People', false],
    ['State', 'Initiatives to the Legislature', true],
    ['Federal', null, false],
    ['State', null, false],
  ])
  assert.deepEqual(sections.map((s) => s.notice ?? null), [null, null, notice, null])
  assert.equal(new Set(sections.map((s) => s.key)).size, sections.length)
})

test('groupRuns joins questions printed under one heading', () => {
  const g = 'Colorado Court of Appeals Judge'
  const items = [
    item('a', 'retention', { ballot: layout(1, 'Judicial', { group: g }) }),
    item('b', 'retention', { ballot: layout(2, 'Judicial', { group: g }) }),
    item('c', 'amendment', { ballot: layout(3, 'State') }),
  ]
  assert.deepEqual(groupRuns(items).map((r) => r.map((i) => i.id)), [['a', 'b'], ['c']])
})

test('choiceLabel shows what the ballot prints for a stored selection', () => {
  const measure = item('m', 'amendment', { ballot: layout(1, 'State', { responses: ['YES/FOR', 'NO/AGAINST'] }) })
  const race = item('r', 'candidate', {
    ballot: layout(2, 'State', { candidates: [{ name: 'Phil Weiser', label: 'Phil Weiser / Lesley Dahlkemper' }] }),
  })
  assert.equal(choiceLabel('YES', measure), 'YES/FOR')
  assert.equal(choiceLabel('NO', measure), 'NO/AGAINST')
  assert.equal(choiceLabel('YES'), 'Yes')
  assert.equal(choiceLabel('Phil Weiser', race), 'Phil Weiser / Lesley Dahlkemper')
  assert.equal(choiceLabel('WRITE-IN:Jane Doe', race), 'Write-in: Jane Doe')
  assert.equal(choiceLabel('ABSTAIN', race), 'Left blank')
  assert.equal(choiceLabel('UNSURE', race), 'No clue yet')
})

test('inPrintedOrder follows the printed layout, then options', async () => {
  const { inPrintedOrder } = await import('../components/ballot/ballot')
  const people = [{ name: 'B' }, { name: 'A' }, { name: 'C' }]
  const layout = { ballot: { order: 1, candidates: [{ name: 'C' }, { name: 'A' }, { name: 'B' }] } }
  assert.deepEqual(inPrintedOrder(people, { metadata: layout }).map((p) => p.name), ['C', 'A', 'B'])
  assert.deepEqual(inPrintedOrder(people, { options: ['A', 'B'] }).map((p) => p.name), ['A', 'B', 'C'])
  assert.deepEqual(inPrintedOrder(people, null).map((p) => p.name), ['B', 'A', 'C'])
})

test('isPick: only real picks, not blank or no-clue', () => {
  assert.equal(isPick('Jane Doe'), true)
  assert.equal(isPick('WRITE-IN:Someone'), true)
  assert.equal(isPick('YES'), true)
  assert.equal(isPick('ABSTAIN'), false)
  assert.equal(isPick('UNSURE'), false)
  assert.equal(isPick('NOTES'), false)
  assert.equal(isPick(undefined), false)
})

test('isSettled / isUnsure: a ? on the contest or on an option is still to go', () => {
  assert.equal(isSettled({ selection: 'Jane Doe', status: 'decided' }), true)
  assert.equal(isSettled({ selection: 'Jane Doe', status: 'tentative' }), true)
  assert.equal(isSettled({ selection: 'ABSTAIN' }), true)
  assert.equal(isSettled({ selection: 'Jane Doe', status: 'unsure' }), false)
  assert.equal(isSettled({ selection: 'UNSURE' }), false)
  assert.equal(isSettled({ selection: 'NOTES', notes: 'look up' }), false)
  assert.equal(isSettled(undefined), false)
  assert.equal(isUnsure({ selection: 'Jane Doe', status: 'unsure' }), true)
  assert.equal(isUnsure({ selection: 'UNSURE' }), true)
  assert.equal(isUnsure({ selection: 'NOTES', status: 'unsure' }), false)
})

test('anchors: readable contest/candidate ids, legacy #contest- links, groups', () => {
  const seat = (n: number): BallotItem =>
    ({
      id: `ca26-laccd-${n}-race`,
      type: 'candidate',
      title: `Trustee, Seat ${n}`,
      office: { id: `ca26-laccd-${n}`, candidates: [{ id: `c${n}`, name: 'ROY PAYAN' }] },
      metadata: {
        ballot: {
          source: 'x',
          style: { party: 'below', responses: 'stacked' },
          order: n,
          section: '',
          heading: ['LOS ANGELES COMMUNITY COLLEGE DISTRICT', `Member of the Board of Trustees, Seat ${n}`],
          instructions: [],
          candidates: [{ name: 'ROY PAYAN', label: 'ROY PAYAN' }],
          writeIn: true,
        },
      },
    }) as unknown as BallotItem
  const prop = { id: 'ca26-m-prop-45', type: 'measure', title: 'Prop 45' } as unknown as BallotItem
  const items = [seat(2), seat(4), seat(6), prop]
  assert.equal(contestDomId(items[0]), 'laccd-2')
  assert.equal(contestDomId(prop), 'prop-45')
  assert.equal(candidateDomId(items[0], 'ROY PAYAN'), 'laccd-2--roy-payan')
  assert.deepEqual(resolveAnchor('#laccd-4', items), { elementId: 'laccd-4', itemIds: ['ca26-laccd-4-race'] })
  assert.deepEqual(resolveAnchor('#contest-ca26-m-prop-45', items), { elementId: 'prop-45', itemIds: ['ca26-m-prop-45'] })
  assert.deepEqual(resolveAnchor('#laccd-2--roy-payan', items), { elementId: 'laccd-2--roy-payan', itemIds: ['ca26-laccd-2-race'] })
  assert.deepEqual(resolveAnchor('#los-angeles-community-college-district', items)?.itemIds, [
    'ca26-laccd-2-race',
    'ca26-laccd-4-race',
    'ca26-laccd-6-race',
  ])
  assert.equal(resolveAnchor('#nope', items), null)
  assert.equal(resolveAnchor('', items), null)
})

test('openingSentence skips the county statement header lines', () => {
  const text =
    'PARTY PREFERENCE: DEMOCRATIC\n\nMEMBER OF THE STATE ASSEMBLY, 49th DISTRICT\n\nMike Fong is a community leader and former Community College Trustee who represents the San Gabriel Valley in the State Assembly.\n\nAs our State Assemblymember, Mike has secured new funding.'
  assert.equal(
    openingSentence(text),
    'Mike Fong is a community leader and former Community College Trustee who represents the San Gabriel Valley in the State Assembly.',
  )
  assert.equal(
    openingSentence(
      'CANDIDATE FOR MEMBER OF THE CITY COUNCIL,5th District\n\nCITY OF MONTEREY PARK GENERAL MUNICIPAL ELECTION\n\nAge: 52\n\nOccupation: Monterey Park Councilmember\n\nMonterey Park gave my immigrant family the opportunity to prosper, and I\'ve spent my life giving back. I grew up here.',
    ),
    "Monterey Park gave my immigrant family the opportunity to prosper, and I've spent my life giving back.",
  )
  assert.equal(openingSentence('I hold a Ph.D. in Political Science from Claremont. Next.'), 'I hold a Ph.D. in Political Science from Claremont.')
  assert.equal(openingSentence('NO STATEMENT'), null)
})
