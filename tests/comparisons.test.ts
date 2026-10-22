// Seeded comparison guides must match their election's ballot and come in fair pairs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { comparisonProblems, type ComparisonFile } from '../lib/comparisons'

const root = join(__dirname, '..', 'data')
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))

for (const file of readdirSync(join(root, 'comparisons')).filter((f) => f.endsWith('.json'))) {
  test(`${file}: every pick is a real choice on the ballot, with a source and quote`, () => {
    const data: ComparisonFile = read(join('comparisons', file))
    const bundle = read(join('elections', `${data.electionSlug}.json`))
    const ballots = new Map<string, { type: string; options: string[] }>()
    for (const o of bundle.offices) ballots.set(`${o.id}-race`, { type: 'candidate', options: o.candidates.map((c: { name: string }) => c.name) })
    for (const m of bundle.measures ?? []) ballots.set(m.id, { type: m.type, options: [] })
    assert.deepEqual(comparisonProblems(data, ballots), [])
  })
}

test('a party guide without its counterpart is refused', () => {
  const lone: ComparisonFile = {
    electionSlug: 'x',
    guides: [{ id: 'a', name: 'A', kind: 'party', lean: 'left', url: 'https://a.example', retrieved: '2026-10-21', about: '', picks: [] }],
  }
  assert.match(comparisonProblems(lone, new Map()).join(), /only one side/)
})
