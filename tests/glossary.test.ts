import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { OFFICE_GLOSSARY, glossaryFor } from '../lib/glossary'
import { isHttpUrl } from '../lib/profile'

const bundles = readdirSync('data/elections')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(`data/elections/${f}`, 'utf8')))
const bundleOffices = new Set(bundles.flatMap((b) => b.offices.map((o: { id: string }) => o.id)))
const bundleMeasures = new Map<string, string>(
  bundles.flatMap((b) => (b.measures ?? []).map((m: { id: string; type: string }) => [m.id, m.type] as [string, string])),
)

test('every glossary entry is sourced and points at real offices', () => {
  assert.ok(OFFICE_GLOSSARY.length > 0)
  const keys = new Set<string>()
  const offices = new Set<string>()
  for (const e of OFFICE_GLOSSARY) {
    assert.ok(!keys.has(e.key), `duplicate key ${e.key}`)
    keys.add(e.key)
    assert.ok(e.plain.trim(), `${e.key}: no summary`)
    assert.ok(e.quotes.length && e.quotes.every((q) => q.trim()), `${e.key}: no official quote`)
    assert.ok(isHttpUrl(e.source.url) && e.source.name, `${e.key}: no source`)
    assert.match(e.source.retrieved, /^\d{4}-\d{2}-\d{2}$/, `${e.key}: no retrieval date`)
    for (const id of e.offices) {
      assert.ok(bundleOffices.has(id), `${e.key}: no office ${id} in data/elections`)
      assert.ok(!offices.has(id), `${id} is in two glossary entries`)
      offices.add(id)
    }
    for (const f of e.facts ?? []) {
      assert.ok(f.plain.trim() && f.quotes.length && isHttpUrl(f.source.url), `${e.key}: unsourced fact`)
    }
    for (const id of e.measures ?? []) assert.ok(bundleMeasures.has(id), `${e.key}: no measure ${id} in data/elections`)
  }
})

test("each retention question gets its own state's retention context, never another state's", () => {
  const byState: Record<string, string> = { ca: 'ca-justice-retention', co: 'co-judge-retention' }
  const retention = [...bundleMeasures].filter(([, type]) => type === 'retention').map(([id]) => id)
  for (const id of retention) assert.equal(glossaryFor(id)?.key, byState[id.slice(0, 2)], id)
})

test('glossaryFor finds an office, and nothing for unknown ones', () => {
  assert.equal(glossaryFor('ca26-insurance-commissioner')?.title, 'Insurance Commissioner')
  assert.equal(glossaryFor('no-such-office'), undefined)
  assert.equal(glossaryFor(null), undefined)
})
