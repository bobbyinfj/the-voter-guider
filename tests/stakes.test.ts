import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { stakesFor } from '../lib/stakes'
import stakes from '../data/measures/stakes.json'

const bundles = readdirSync('data/elections').map((f) => JSON.parse(readFileSync(`data/elections/${f}`, 'utf8')))
const measures = bundles.flatMap((b) => b.measures as { id: string }[])

test('every dollar figure quotes the official text of its measure', () => {
  for (const [id, m] of Object.entries(stakes)) {
    const measure = measures.find((x) => x.id === id)
    assert.ok(measure, id)
    if ('source' in m) assert.match(String(m.source), /^https:/)
    else assert.ok(JSON.stringify(measure).includes(m.quote), `${id}: ${m.quote}`)
  }
})

test('the grade follows the written rule, and retention questions get none', () => {
  assert.equal(stakesFor({ id: 'x', type: 'retention', split: true }), null)
  assert.equal(stakesFor({ id: 'x', type: 'proposition', level: 'state', split: false })?.grade, 'Lower')
  assert.equal(stakesFor({ id: 'x', type: 'proposition', level: 'state', question: 'an amendment to the Constitution', split: false })?.grade, 'Medium')
  assert.equal(stakesFor({ id: 'ca26-m-prop-3', type: 'proposition', level: 'state', question: 'an amendment to the Constitution', split: false })?.grade, 'High')
  assert.equal(stakesFor({ id: 'x', type: 'measure', level: 'county', split: true })?.grade, 'Medium')
  assert.equal(stakesFor({ id: 'wa26-m-ip26-645', type: 'initiative', level: 'state', split: false })?.grade, 'High')
})
