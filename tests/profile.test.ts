import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { initials, isHttpUrl, snippet, type CandidateProfile } from '../lib/profile'

test('initials', () => {
  const i = (name: string, kind: 'org' | 'official' | 'media' | 'person') => initials({ name, kind })
  assert.equal(i('The Stranger', 'media'), 'ST')
  assert.equal(i('UFCW 3000', 'org'), 'UFCW')
  assert.equal(i('32nd Legislative District Democrats', 'org'), '32')
  assert.equal(i('Washington Conservation Action', 'org'), 'WCA')
  assert.equal(i('A-1 Mart', 'org'), 'AM')
  assert.equal(i('Rep. Gerry Pollet, 46th LD', 'official'), 'GP')
  assert.equal(i('Former King County Councilmember Larry Phillips', 'official'), 'LP')
  assert.equal(i('Judge Kevin Peck', 'official'), 'KP')
})

test('isHttpUrl only allows http(s)', () => {
  assert.ok(isHttpUrl('https://example.org/a'))
  assert.ok(!isHttpUrl('javascript:alert(1)'))
  assert.ok(!isHttpUrl('example.org'))
  assert.ok(!isHttpUrl(null))
})

test('snippet puts news outlets and organizations first and counts individuals', () => {
  const profile: CandidateProfile = {
    endorsements: {
      source: { url: 'https://x.org', retrieved: '2026-10-20' },
      list: [
        { name: 'Mayor A', kind: 'official' },
        { name: 'Org B', kind: 'org' },
        { name: 'Paper C', kind: 'media' },
      ],
      individuals: 10,
    },
    videos: [
      { youtubeId: 'aaaaaaaaaaa', kind: 'statement', title: 't', channel: 'c', published: '2026-10-01' },
      { youtubeId: 'bbbbbbbbbbb', kind: 'interview', title: 't', channel: 'c', published: '2026-10-01' },
    ],
  }
  const s = snippet(profile, 2)!
  assert.deepEqual(s.endorsers.map((e) => e.name), ['Paper C', 'Org B'])
  assert.equal(s.endorserTotal, 13)
  assert.equal(s.video?.youtubeId, 'bbbbbbbbbbb')
  assert.equal(snippet(null), null)
})

// Every enrichment file only describes candidates in its election bundle, and every item
// carries its source (the builder checks the text itself against the saved sources)
test('enrichment files are well-formed and sourced', () => {
  for (const file of readdirSync('data/enrichment')) {
    const { slug, candidates } = JSON.parse(readFileSync(`data/enrichment/${file}`, 'utf8'))
    const bundle = JSON.parse(readFileSync(`data/elections/${slug}.json`, 'utf8'))
    const ids = new Set(bundle.offices.flatMap((o: { candidates: { id: string }[] }) => o.candidates.map((c) => c.id)))
    for (const [id, p] of Object.entries(candidates) as [string, CandidateProfile][]) {
      assert.ok(ids.has(id), `${file}: ${id} not in ${slug}`)
      if (p.summary) assert.ok(isHttpUrl(p.summary.source.url), `${id}: summary source`)
      if (p.website) assert.ok(isHttpUrl(p.website), `${id}: website ${p.website}`)
      for (const v of p.videos ?? []) {
        assert.match(v.youtubeId, /^[\w-]{11}$/, `${id}: video id`)
        assert.ok(v.title && v.channel && /^2026-/.test(v.published), `${id}: video ${v.youtubeId} metadata`)
      }
      if (p.endorsements) {
        assert.ok(isHttpUrl(p.endorsements.source.url), `${id}: endorsements source`)
        assert.match(p.endorsements.source.retrieved, /^\d{4}-\d{2}-\d{2}$/)
        for (const e of p.endorsements.list) assert.ok(['org', 'official', 'media', 'person'].includes(e.kind))
      }
    }
  }
})
