// Every election bundle must agree with the official sample ballot it was built from
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '..', 'data')
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const bundles = readdirSync(join(root, 'elections')).filter((f) => f.endsWith('-general-2026-11-03.json'))
type Contest = { title: string | string[]; section: string; candidates?: { name: string; party?: string; designation?: string }[]; questions?: { text: string; responses: string[] }[] }
const samples: Record<string, { contests: Contest[] }> = Object.fromEntries(
  readdirSync(join(root, 'research', 'sample-ballots'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const s = read(join('research', 'sample-ballots', f))
      return [s.source, s]
    }),
)
const heading = (c: Contest) => (Array.isArray(c.title) ? c.title : [c.title])

for (const file of bundles) {
  const bundle = read(join('elections', file))
  const items = [...bundle.offices, ...(bundle.measures ?? [])]

  test(`${file}: ids are unique`, () => {
    const ids = items.map((i: { id: string }) => i.id)
    assert.equal(new Set(ids).size, ids.length)
    const cands = bundle.offices.flatMap((o: { candidates: { id: string }[] }) => o.candidates.map((c) => c.id))
    assert.equal(new Set(cands).size, cands.length)
  })

  const laid = items.filter((i: { ballot?: unknown }) => i.ballot)
  if (!laid.length) continue

  test(`${file}: every item has a printed layout, in a unique position`, () => {
    assert.equal(laid.length, items.length)
    const orders = laid.map((i: { ballot: { order: number } }) => i.ballot.order)
    assert.equal(new Set(orders).size, orders.length)
  })

  test(`${file}: layout matches the parsed sample ballot verbatim`, () => {
    for (const item of laid) {
      const b = item.ballot
      const sample = samples[b.source]
      assert.ok(sample, `${item.id}: no parsed sample ballot for ${b.source}`)
      const contest = sample.contests.find(
        (c) => c.section === b.section && JSON.stringify(heading(c)) === JSON.stringify(b.heading),
      )
      assert.ok(contest, `${item.id}: heading ${b.heading} not on the sample ballot`)
      if (item.candidates) {
        // Same people, same printed order, same printed party labels
        assert.deepEqual(b.candidates.map((c: { label: string }) => c.label), contest.candidates!.map((c) => c.name), item.id)
        assert.deepEqual(item.candidates.map((c: { name: string }) => c.name), b.candidates.map((c: { name: string }) => c.name), item.id)
        for (const [i, c] of contest.candidates!.entries()) {
          // LA's ballot data has no party; California's "Party Preference: X" comes from the SOS list
          const printed = b.candidates[i]
          if (c.party !== undefined || !printed.party?.startsWith('Party Preference: ')) assert.equal(printed.party, c.party, item.id)
          assert.equal(printed.designation, c.designation, item.id)
        }
      } else {
        const q = contest.questions!.find((x) => x.text === b.question)
        assert.ok(q, `${item.id}: question text not on the sample ballot`)
        assert.deepEqual(b.responses, q.responses)
      }
    }
  })
}
