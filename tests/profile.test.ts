import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { evaluationMeets, formatDuration, initials, leadRung, isHttpUrl, leadVideo, mentionsMoney, videoLadder, videoTier, snippet, sortVideos, type CandidateProfile, type CandidateVideo, type RaceExtras, VIDEO_ORIGINS } from '../lib/profile'

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

test('the most independent bite or snack plays first, not just the shortest', () => {
  const v = (youtubeId: string, durationSec: number, origin: CandidateVideo['origin']): CandidateVideo => ({
    youtubeId, kind: 'interview', origin, title: youtubeId, channel: 'c', published: '2026-10-01', durationSec,
  })
  // A 1-minute council clip and a 10-minute school interview: the interview leads
  const ladder = videoLadder([{ video: v('school', 576, 'civic') }, { video: v('meeting', 60, 'government') }])
  assert.equal(ladder[leadRung(ladder)].video.youtubeId, 'school')
  // Same origin: the shorter one
  const same = videoLadder([{ video: v('long', 500, 'independent') }, { video: v('short', 60, 'independent') }])
  assert.equal(same[leadRung(same)].video.youtubeId, 'short')
  assert.equal(leadRung(videoLadder([{ video: v('forum', 9000, 'civic') }])), -1)
})

test('judge evaluations: every Colorado retention question has one, credited and verbatim-shaped', () => {
  const file = JSON.parse(readFileSync('data/enrichment/co-general-2026-11-03.json', 'utf-8'))
  const bundle = JSON.parse(readFileSync('data/elections/co-general-2026-11-03.json', 'utf-8'))
  const retentions = bundle.measures.filter((m: { type?: string }) => m.type === 'retention')
  for (const m of retentions) {
    const e = file.measures[m.id]?.evaluation
    assert.ok(e, `${m.id} has no evaluation`)
    assert.ok(isHttpUrl(e.source.url) && e.source.retrieved, `${m.id}: source`)
    assert.ok(e.finding.includes(e.vote), `${m.id}: the vote comes from the finding`)
  }
  const e = { recommendation: 'Meets Performance Standards' } as Parameters<typeof evaluationMeets>[0]
  assert.equal(evaluationMeets(e), true)
  assert.equal(evaluationMeets({ ...e, recommendation: 'Does Not Meet Performance Standards' }), false)
})

test('judge biographies: every California retention question has its court biography, rating words from its sentence', () => {
  const file = JSON.parse(readFileSync('data/enrichment/ca-general-2026-11-03.json', 'utf-8'))
  const bundle = JSON.parse(readFileSync('data/elections/ca-general-2026-11-03.json', 'utf-8'))
  for (const m of bundle.measures.filter((x: { type?: string }) => x.type === 'retention')) {
    const e = file.measures[m.id]?.evaluation
    assert.equal(e?.kind, 'biography', `${m.id} has no biography`)
    assert.ok(isHttpUrl(e.source.url) && e.paragraphs.length, `${m.id}: source and text`)
    if (e.ratingWords) assert.ok(e.rating.includes(e.ratingWords), `${m.id}: rating words come from the rating sentence`)
  }
})

test('every judge on a ballot has a sourced record line or rating where a source covers them', async () => {
  const { biographyLine, judgeRecord } = await import('../components/ballot/ballot')
  for (const file of readdirSync('data/enrichment')) {
    const e = JSON.parse(readFileSync(`data/enrichment/${file}`, 'utf8'))
    const b = JSON.parse(readFileSync(`data/elections/${file}`, 'utf8'))
    // Retention questions: the commission's line (CO) or a biography line (CA) for every one
    for (const m of b.measures ?? []) {
      if (!/-retain-/.test(m.id)) continue
      const ev = (e.measures?.[m.id] as RaceExtras | undefined)?.evaluation
      assert.ok(ev, `${m.id}: no evaluation`)
      if (ev.kind === 'biography') assert.ok(biographyLine(ev), `${m.id}: biography gives no line`)
    }
    // A race a bar list covers: every candidate in it gets a line (a rating or the list's N/A)
    for (const o of b.offices ?? []) {
      const lines = o.candidates.map((c: { id: string }) => judgeRecord(snippet(e.candidates?.[c.id])))
      if (lines.some(Boolean)) assert.ok(lines.every(Boolean), `${o.id}: a bar rating for one side only`)
    }
  }
})

test('a carousel steps from the shortest video to the longest, parts of long shows by their own length', async () => {
  const { shortestFirst } = await import('../lib/profile')
  const v = (youtubeId: string, extra: Partial<CandidateVideo>): CandidateVideo => ({
    youtubeId, kind: 'explainer', origin: 'independent', title: youtubeId, channel: 'X', published: '2026-10-01', ...extra,
  })
  const order = shortestFirst([
    v('debate', { kind: 'debate', durationSec: 4394 }),
    v('segment', { durationSec: 5303, startSec: 4080, endSec: 4597 }),
    v('open-ended', { kind: 'forum', startSec: 100 }),
    v('campaign-clip', { origin: 'campaign', durationSec: 111 }),
    v('news', { durationSec: 111 }),
  ]).map((x) => x.youtubeId)
  assert.deepEqual(order, ['news', 'campaign-clip', 'segment', 'debate', 'open-ended'])
})

test("a forum participant's own turn is a bite or snack, not the whole forum", () => {
  const video = { youtubeId: 'zh-W4Flzx2c', kind: 'forum', title: 'Forum', channel: 'x', durationSec: 6223, origin: 'civic' } as CandidateVideo
  assert.equal(videoTier({ video, startSec: 2175, endSec: 2266 }), 'bite')
  assert.equal(videoTier({ video, startSec: 270, endSec: 473 }), 'snack')
  assert.equal(videoTier({ video, startSec: 2175 }), 'meal')
})

test('every forum turn in the enrichment data has a sane length', () => {
  for (const file of readdirSync('data/enrichment')) {
    const data = JSON.parse(readFileSync(`data/enrichment/${file}`, 'utf8'))
    for (const race of Object.values<{ videos?: CandidateVideo[] }>(data.races ?? {}))
      for (const v of race.videos ?? [])
        for (const p of v.participants ?? [])
          if (p.endSec !== undefined) {
            assert.ok(p.startSec !== undefined && p.endSec > p.startSec + 20 && p.endSec - p.startSec <= 600, `${p.id} in ${v.youtubeId}`)
            assert.ok(!v.durationSec || p.endSec <= v.durationSec)
          }
  }
})

test('mentionsMoney finds cost language in a quote', () => {
  assert.equal(mentionsMoney('a state-run authority funded by premiums'), true)
  assert.equal(mentionsMoney('It would cost $2 billion'), true)
  assert.equal(mentionsMoney('I am Marie Ledezma, and I am one of you.'), false)
  assert.equal(mentionsMoney('Costanza refunding the fundamentals'), false)
  assert.equal(mentionsMoney(null), false)
})
