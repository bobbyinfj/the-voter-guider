import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { formatDuration, initials, isHttpUrl, leadVideo, videoLadder, videoTier, snippet, sortVideos, type CandidateProfile, type CandidateVideo, type RaceExtras, VIDEO_ORIGINS } from '../lib/profile'

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
      { youtubeId: 'aaaaaaaaaaa', kind: 'statement', origin: 'independent', title: 't', channel: 'c', published: '2026-10-01' },
      { youtubeId: 'bbbbbbbbbbb', kind: 'interview', origin: 'independent', title: 't', channel: 'c', published: '2026-10-01' },
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
    const { slug, candidates, races = {}, measures = {} } = JSON.parse(readFileSync(`data/enrichment/${file}`, 'utf8'))
    const bundle = JSON.parse(readFileSync(`data/elections/${slug}.json`, 'utf8'))
    const ids = new Set(bundle.offices.flatMap((o: { candidates: { id: string }[] }) => o.candidates.map((c) => c.id)))
    for (const [id, p] of Object.entries(candidates) as [string, CandidateProfile][]) {
      assert.ok(ids.has(id), `${file}: ${id} not in ${slug}`)
      if (p.summary) assert.ok(isHttpUrl(p.summary.source.url), `${id}: summary source`)
      if (p.website) assert.ok(isHttpUrl(p.website), `${id}: website ${p.website}`)
      for (const v of p.videos ?? []) checkVideo(id, v)
      if (p.endorsements) {
        assert.ok(isHttpUrl(p.endorsements.source.url), `${id}: endorsements source`)
        assert.match(p.endorsements.source.retrieved, /^\d{4}-\d{2}-\d{2}$/)
        for (const e of p.endorsements.list) assert.ok(['org', 'official', 'media', 'person'].includes(e.kind))
      }
    }
    const offices = new Set(bundle.offices.map((o: { id: string }) => o.id))
    for (const [id, r] of Object.entries(races) as [string, RaceExtras][]) {
      assert.ok(offices.has(id), `${file}: race ${id} not in ${slug}`)
      for (const v of r.videos ?? []) {
        checkVideo(id, v)
        for (const who of v.participants ?? []) assert.ok(ids.has(who.id), `${id}: participant ${who.id}`)
      }
      for (const l of r.links ?? []) assert.ok(isHttpUrl(l.url) && l.label, `${id}: link`)
    }
    const measureIds = new Set(bundle.measures.map((m: { id: string }) => m.id))
    for (const [id, r] of Object.entries(measures) as [string, RaceExtras][]) {
      assert.ok(measureIds.has(id), `${file}: measure ${id} not in ${slug}`)
      for (const v of r.videos ?? []) checkVideo(id, v)
    }
  }
})

// Every video says who made it; public-meeting clips may be from the past year, others from 2026
function checkVideo(owner: string, v: CandidateVideo) {
  assert.match(v.youtubeId, /^[\w-]{11}$/, `${owner}: video id`)
  assert.ok(v.title && v.channel, `${owner}: video ${v.youtubeId} metadata`)
  assert.ok(Object.keys(VIDEO_ORIGINS).includes(v.origin), `${owner}: video ${v.youtubeId} origin ${v.origin}`)
  assert.ok(v.kind === 'meeting' ? v.published >= '2025-10-01' : /^2026-/.test(v.published), `${owner}: video ${v.youtubeId} date`)
  if (v.kind === 'meeting') assert.ok(isHttpUrl(v.sourceUrl), `${owner}: meeting clip ${v.youtubeId} needs its transcript link`)
  if (v.origin === 'campaign') assert.ok(isHttpUrl(v.sourceUrl), `${owner}: campaign video ${v.youtubeId} needs the page it's on`)
}

test('leadVideo prefers the most independent source, then interviews', () => {
  const v = (youtubeId: string, kind: CandidateVideo['kind'], origin: CandidateVideo['origin']): CandidateVideo =>
    ({ youtubeId, kind, origin, title: 't', channel: 'c', published: '2026-10-01' })
  const list = [v('campaign-int', 'interview', 'campaign'), v('meeting', 'meeting', 'government'), v('lwv-stmt', 'statement', 'independent'), v('lwv-int', 'interview', 'independent')]
  assert.equal(leadVideo(list)?.youtubeId, 'lwv-int')
  assert.deepEqual(sortVideos(list).map((x) => x.youtubeId), ['lwv-int', 'lwv-stmt', 'meeting', 'campaign-int'])
  assert.equal(leadVideo([]), null)
})

test('videos: bite (≤2 min) leads into snack (≤10 min) into meal (longer or open-ended)', () => {
  const v = (youtubeId: string, durationSec?: number, extra: Partial<CandidateVideo> = {}): CandidateVideo => ({
    youtubeId, kind: 'interview', origin: 'independent', title: youtubeId, channel: 'c', published: '2026-10-01', durationSec, ...extra,
  })
  assert.equal(videoTier({ video: v('a', 90) }), 'bite')
  assert.equal(videoTier({ video: v('b', 400) }), 'snack')
  assert.equal(videoTier({ video: v('c', 9000) }), 'meal')
  // A 90-second clip of a 3-hour forum is a bite; their part of a forum with no known end is a meal
  assert.equal(videoTier({ video: v('d', 10800, { startSec: 600, endSec: 690 }) }), 'bite')
  assert.equal(videoTier({ video: v('e', 10800), startSec: 600 }), 'meal')
  const ladder = videoLadder([{ video: v('long', 9000) }, { video: v('mid', 400) }, { video: v('mid2', 300) }, { video: v('short', 60) }])
  assert.deepEqual(ladder.map((p) => [p.tier, p.video.youtubeId]), [['bite', 'short'], ['snack', 'mid'], ['meal', 'long']])
  assert.equal(formatDuration(9360), '2 h 36 min')
  assert.equal(formatDuration(7200), '2 h')
  assert.equal(formatDuration(400), '7 min')
})
