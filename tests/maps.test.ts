import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { districtMapsOf } from '@/lib/maps'

// Every district map (data/maps, from map-builders/districts.py) matches its election bundle
for (const file of readdirSync('data/maps').filter((f) => f.endsWith('.json'))) {
  test(`${file}: each district with a race is on its map, flagged as on the ballot`, () => {
    const map = JSON.parse(readFileSync(`data/maps/${file}`, 'utf-8'))
    assert.ok(existsSync(`data/elections/${file}`), 'no bundle with this slug')
    assert.ok(districtMapsOf({ maps: map }), 'not a valid maps file')
    const bundle = JSON.parse(readFileSync(`data/elections/${file}`, 'utf-8'))
    const items: { districtType?: string; districtCode?: string }[] = [...bundle.offices, ...(bundle.measures ?? [])]
    for (const m of map.maps) {
      const onBallot = new Set(items.filter((i) => i.districtType === m.districtType).map((i) => i.districtCode))
      const drawn = new Map<string, boolean>(m.districts.map((d: { code: string; onBallot: boolean }) => [d.code, d.onBallot]))
      for (const code of onBallot) assert.equal(drawn.get(code!), true, `${m.districtType} ${code} missing or not flagged`)
      for (const [code, flagged] of drawn) assert.equal(flagged, onBallot.has(code), `${m.districtType} ${code} flagged wrongly`)
      assert.match(m.source.url, /^https:\/\//)
    }
  })
}

test('districtMapsOf rejects malformed metadata', () => {
  assert.equal(districtMapsOf(null), null)
  assert.equal(districtMapsOf({ maps: { base: {} } }), null)
})
