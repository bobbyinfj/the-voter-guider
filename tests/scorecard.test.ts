import { test } from 'node:test'
import assert from 'node:assert/strict'
import { badgesFrom, factCheckScore, flagsFor, raceHasAnyFactChecks, raceHasFactChecks, type FactCheckRecord } from '@/lib/scorecard'
import type { NewsGuide, ProfileSnippet } from '@/lib/profile'

const record = (counts: Partial<FactCheckRecord['counts']>): FactCheckRecord => ({
  publisher: 'PolitiFact',
  url: 'https://www.politifact.com/personalities/x/',
  retrieved: '2026-10-22',
  counts: { true: 0, 'mostly-true': 0, 'half-true': 0, 'mostly-false': 0, false: 0, 'pants-fire': 0, ...counts },
})
const snip = (extra: Partial<ProfileSnippet>): ProfileSnippet => ({
  headline: null,
  summarySource: null,
  video: null,
  endorsers: [],
  endorserTotal: 0,
  endorsementsUrl: null,
  guide: null,
  factCheck: null,
  claims: [],
  bar: null,
  ethics: null,
  videos: [],
  ...extra,
})
const guide = (extra: Partial<NewsGuide>): NewsGuide => ({
  source: { publisher: 'LAist', byline: 'LAist', url: 'https://laist.com/g', retrieved: '2026-10-22' },
  ...extra,
})

test('the 💩 share counts Mostly False, False and Pants on Fire', () => {
  assert.deepEqual(factCheckScore(record({ true: 2, 'half-true': 1, 'mostly-false': 1, false: 1, 'pants-fire': 1 })), {
    total: 6,
    falseish: 3,
    pct: 50,
  })
})

test('too few rulings, or none, never becomes a percentage', () => {
  assert.equal(factCheckScore(record({ false: 4 })).pct, null)
  assert.equal(factCheckScore(null).pct, null)
  assert.equal(factCheckScore(record({})).total, 0)
})

test('a race only gets percentages when everyone in it has enough rulings', () => {
  const enough = { profile: snip({ factCheck: record({ true: 5 }) }) }
  const thin = { profile: snip({ factCheck: record({ true: 2 }) }) }
  assert.equal(raceHasFactChecks([enough, enough]), true)
  assert.equal(raceHasFactChecks([enough, thin]), false)
  assert.equal(raceHasFactChecks([enough, { profile: null }]), false)
  assert.equal(raceHasFactChecks([enough]), false)
})

test('flags say which checks ran, and only flag what the source says', () => {
  assert.deepEqual(flagsFor(null), { checked: [], flags: [] })
  const answered = flagsFor(snip({ guide: guide({ answers: [{ q: 'Why?', a: 'Because.' }] }) }))
  assert.deepEqual(answered, { checked: ['skipped-news-survey'], flags: [] })
  const skipped = flagsFor(snip({ guide: guide({ note: 'Roy Payan did not respond to LAist’s request.' }) }))
  assert.equal(skipped.flags[0].level, 'yellow')
  assert.equal(skipped.flags[0].source.url, 'https://laist.com/g')
  const rating = (value: string) =>
    guide({ rating: { by: 'Los Angeles County Bar Association', value, source: { title: 't', url: 'https://lacba.org/r', retrieved: '2026-10-22' } } })
  assert.deepEqual(flagsFor(snip({ guide: rating('Qualified') })).flags, [])
  assert.equal(flagsFor(snip({ guide: rating('Not Qualified') })).flags[0].level, 'red')
})

test('badges come from published guides, with their source', () => {
  const map = badgesFrom([
    {
      title: 'California Democratic Party',
      metadata: { comparison: { kind: 'party', lean: 'left', url: 'https://cadem.org' } },
      choices: [{ ballotId: 'b1', selection: 'A', sourceUrl: 'https://cadem.org/p', notes: 'A for Governor' }],
    },
    { title: 'Not a comparison', metadata: {}, choices: [{ ballotId: 'b1', selection: 'B', sourceUrl: null, notes: null }] },
  ])
  assert.deepEqual(Object.keys(map.b1), ['A'])
  assert.equal(map.b1.A[0].url, 'https://cadem.org/p')
  assert.equal(map.b1.A[0].lean, 'left')
})

test('State Bar discipline is a red flag; a clean or unmatched record only says it was checked', () => {
  const bar = (discipline: string[], extra = {}) => snip({ bar: { publisher: 'State Bar of California', url: 'https://apps.calbar.ca.gov/x', status: 'Active', discipline, ...extra } })
  assert.deepEqual(flagsFor(bar([])), { checked: ['bar-discipline'], flags: [] })
  assert.equal(flagsFor(bar(['1/1/2020 · Public Reproval'])).flags[0].level, 'red')
  assert.deepEqual(flagsFor(snip({ bar: { publisher: 'State Bar of California', unmatched: 'several' } })), { checked: [], flags: [] })
})

test('every FPPC fine is a yellow flag citing its release', () => {
  const ethics = (fines: NonNullable<ProfileSnippet['ethics']>['fines']) =>
    snip({ ethics: { publisher: 'Fair Political Practices Commission', from: '2021-01', to: '2026-10', releases: 70, fines } })
  assert.deepEqual(flagsFor(ethics([])), { checked: ['ethics-fine'], flags: [] })
  const f = { respondent: 'A', case: '21/1', fine: 200, summary: 'A failed to file.', shared: false, url: 'https://www.fppc.ca.gov/r', month: '2024-09', retrieved: '2026-10-22' }
  const { flags } = flagsFor(ethics([f, { ...f, case: '22/2' }]))
  assert.equal(flags.length, 2)
  assert.equal(flags[0].level, 'yellow')
  assert.equal(flags[0].source.url, 'https://www.fppc.ca.gov/r')
  assert.match(flags[0].text, /\$200/)
})

test('a race gets a 💩 meter only when someone in it has been fact-checked', () => {
  const none = { profile: snip({}) }
  const ruled = { profile: snip({ factCheck: record({ false: 1 }) }) }
  const claimed = { profile: snip({ claims: [{ claim: 'x', verdict: 'y', publisher: 'CapRadio', url: 'https://example.test' }] as never }) }
  assert.equal(raceHasAnyFactChecks([none, none]), false)
  assert.equal(raceHasAnyFactChecks([none, ruled]), true)
  assert.equal(raceHasAnyFactChecks([claimed, { profile: null }]), true)
})
