import { test } from 'node:test'
import assert from 'node:assert/strict'
import { guideText, helpRequestText } from '@/components/ballot/export'
import { UNSURE, type BallotItem, type BallotSection } from '@/components/ballot/ballot'

const race = (id: string, title: string, names: string[]): BallotItem => ({
  id,
  title,
  type: 'candidate',
  office: { id: `o-${id}`, candidates: names.map((name) => ({ id: name, name, incumbent: false }) as never) },
})
const clerk = race('clerk', 'City Clerk', ['Dora Leung'])
const sheriff = race('sheriff', 'Sheriff', ['Alex Villanueva', 'Robert G. Luna'])
const gov = race('gov', 'Governor', ['Xavier Becerra', 'Steve Hilton'])
const council = race('council', 'City Council', ['A', 'B'])
const sections: BallotSection[] = [{ key: 'all', label: 'Local', items: [gov, sheriff, clerk, council] } as BallotSection]
const info = {
  guideTitle: 'My guide',
  electionTitle: '2026 General Election',
  date: 'Nov 3, 2026',
  sections,
  choices: {
    gov: { selection: 'Xavier Becerra', status: 'decided' as const },
    sheriff: { selection: UNSURE, notes: 'what does the sheriff oversee?' },
    clerk: { selection: 'Dora Leung', status: 'unsure' as const },
  },
}

test('Copy for an AI: stuck contests first, with their choices and notes; asks for sources, not a pick', () => {
  const text = helpRequestText({ ...info, link: 'https://example.test/elections/x' })
  assert.ok(text.includes("Don't tell me how to vote"))
  const order = ['NO CLUE YET', 'NOT SURE', "HAVEN'T LOOKED AT YET", 'DECIDED'].map((h) => text.indexOf(h))
  assert.deepEqual([...order].sort((a, b) => a - b), order)
  assert.ok(order.every((i) => i > 0))
  assert.ok(text.includes('Choices: Alex Villanueva / Robert G. Luna'))
  assert.ok(text.includes('Notes: what does the sheriff oversee?'))
  assert.ok(text.includes('Choices: Dora Leung (only one candidate)'))
  // Decided contests aren't padded with their choices
  assert.ok(!text.includes('Choices: Xavier Becerra'))
  assert.ok(!text.includes('LEANING'))
})

test('Text export lists every contest with its pick', () => {
  const text = guideText(info)
  assert.ok(text.includes('  Sheriff: No clue yet'))
  assert.ok(text.includes('  City Clerk: Dora Leung (not sure)'))
  assert.ok(text.includes('  City Council: (no choice)'))
})
