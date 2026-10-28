import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

// The ballot only knows "vote for one" (and Yes/No). Ranked-choice contests (Fort Collins city races
// from 2025, odd years; Seattle city primaries from Aug 2027) need ranking support first: until
// then, a bundle with a contest that asks voters to rank must fail here, not quietly show as
// vote-for-one.
const RANKED = /\b(rank(ed)?|ranking)\b|\b(1st|first|2nd|second) choice\b|instant[- ]runoff/i

test('no contest asks voters to rank candidates (ranking is not supported yet)', () => {
  for (const f of readdirSync('data/elections').filter((f) => f.endsWith('.json'))) {
    const bundle = JSON.parse(readFileSync(`data/elections/${f}`, 'utf8'))
    for (const o of bundle.offices) {
      const printed = [...(o.ballot?.heading ?? []), ...(o.ballot?.instructions ?? []), o.description ?? ''].join(' ')
      assert.ok(!RANKED.test(printed) && o.votingMethod !== 'ranked', `${f}: ${o.title} looks ranked-choice ("${printed}"); add ranking support first`)
    }
  }
})
