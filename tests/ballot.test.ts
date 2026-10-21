import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  choiceLabel,
  groupRuns,
  groupSections,
  hasPrintedLayout,
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
})
