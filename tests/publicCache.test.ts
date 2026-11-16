// The public-data cache stores JSON; Dates must come back as Dates
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fromCacheJson, toCacheJson } from '../lib/publicCache'

test('Dates survive the cache, nested and in arrays', () => {
  const value = {
    electionDate: new Date('2026-11-03T00:00:00.000Z'),
    ballots: [{ id: 'b1', at: new Date('2026-10-01T12:30:00.000Z'), metadata: { scope: { city: 'x' } } }],
    nothing: null,
    title: 'T',
  }
  const back = fromCacheJson<typeof value>(toCacheJson(value))
  assert.ok(back.electionDate instanceof Date)
  assert.equal(back.electionDate.toISOString(), '2026-11-03T00:00:00.000Z')
  assert.ok(back.ballots[0].at instanceof Date)
  assert.deepEqual(back, value)
})

test('Sets must be converted first, not silently emptied', () => {
  assert.throws(() => toCacheJson({ ids: new Set(['a']) }))
})

test('date-like strings stay strings', () => {
  const back = fromCacheJson<{ s: string }>(toCacheJson({ s: '2026-11-03T00:00:00.000Z' }))
  assert.equal(typeof back.s, 'string')
})
