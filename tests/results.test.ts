import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { share } from '../lib/results'

test('primary results list real November candidates and add up', () => {
  for (const file of readdirSync('data/results')) {
    const data = JSON.parse(readFileSync(`data/results/${file}`, 'utf8'))
    const bundle = JSON.parse(readFileSync(`data/elections/${file}`, 'utf8'))
    assert.match(data.url, /^https:/)
    for (const [id, race] of Object.entries<{ total: number; others: number; candidates: { name: string; votes: number }[] }>(data.races)) {
      const office = bundle.offices.find((o: { id: string }) => o.id === id)
      assert.ok(office, id)
      assert.equal(race.candidates.length, office.candidates.length, id)
      assert.equal(race.candidates.reduce((n, c) => n + c.votes, race.others), race.total, id)
      assert.ok(race.others >= 0, id)
    }
  }
})

test('share is a percent to one decimal', () => {
  assert.equal(share(1, 3), 33.3)
  assert.equal(share(0, 0), 0)
})
