import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NO_RACE, cityPagesOf, districtOptions, electionPageFor, matchesSelection, parseDistrictSelection } from '@/lib/districts'

test('parseDistrictSelection keeps only known types with short alphanumeric codes', () => {
  assert.deepEqual(
    parseDistrictSelection({ congressional: '7', legislative: '43; DROP TABLE', bogus: '1', 'city-council': 5 }),
    { congressional: '7' },
  )
  assert.deepEqual(parseDistrictSelection(new URLSearchParams('legislative=43&county-council=4')), {
    legislative: '43',
    'county-council': '4',
  })
})

test('matchesSelection shows unscoped items always and scoped items only for the chosen district', () => {
  const race = { districtType: 'legislative', districtCode: '43' }
  assert.equal(matchesSelection({ districtType: null, districtCode: null }, { legislative: '37' }), true)
  assert.equal(matchesSelection(race, {}), true)
  assert.equal(matchesSelection(race, { legislative: '43' }), true)
  assert.equal(matchesSelection(race, { legislative: '37' }), false)
  assert.equal(matchesSelection(race, { legislative: NO_RACE }), false)
})

test('districtOptions lists each district present, numerically sorted', () => {
  const options = districtOptions([
    { districtType: 'legislative', districtCode: '43', district: 'Legislative District 43' },
    { districtType: 'legislative', districtCode: '11', district: 'Legislative District 11' },
    { districtType: 'congressional', districtCode: '7', district: 'WA-7' },
    { districtType: null, districtCode: null },
  ])
  assert.deepEqual(options.map((o) => [o.type, o.codes.map((c) => c.code)]), [
    ['congressional', ['7']],
    ['legislative', ['11', '43']],
  ])
})

test('metadata.scope limits an item to a city, on top of its own district', () => {
  const mbCouncil = { districtType: 'city-council', districtCode: 'mb-1', metadata: { scope: { city: 'montebello' } } }
  const mpOnly = { districtType: null, districtCode: null, metadata: { scope: { city: 'monterey-park' } } }
  assert.equal(matchesSelection(mbCouncil, {}), true)
  assert.equal(matchesSelection(mbCouncil, { city: 'montebello' }), true)
  assert.equal(matchesSelection(mbCouncil, { city: 'monterey-park' }), false)
  assert.equal(matchesSelection(mbCouncil, { city: 'montebello', 'city-council': '5' }), false)
  assert.equal(matchesSelection(mpOnly, { city: 'montebello' }), false)
  assert.equal(matchesSelection(mpOnly, { 'city-council': '5' }), true)
  const options = districtOptions([
    { ...mbCouncil, district: 'Montebello Council District 1' },
    { ...mpOnly, district: null },
    { districtType: 'city-council', districtCode: '5', district: 'Council District 5', metadata: { scope: { city: 'monterey-park' } } },
  ])
  assert.deepEqual(options.map((o) => [o.type, o.codes]), [
    ['city', [{ code: 'montebello', label: 'Montebello' }, { code: 'monterey-park', label: 'Monterey Park' }]],
    ['city-council', [{ code: '5', label: 'Council District 5' }, { code: 'mb-1', label: 'Montebello Council District 1' }]],
  ])
})

test('cityPagesOf reads each city page and ignores malformed ones', () => {
  const meta = { cities: { 'monterey-park': { title: 'MP', description: 'd' }, bad: { title: 1 }, 'has space': { title: 't', description: 'd' } } }
  assert.deepEqual(cityPagesOf(meta), { 'monterey-park': { title: 'MP', description: 'd' } })
  assert.deepEqual(cityPagesOf(null), {})
  assert.deepEqual(cityPagesOf({ cities: 'x' }), {})
})

test("electionPageFor sends a city's race to its city page, and shared races to the election", () => {
  const election = { id: 'ca', title: 'Both', metadata: { cities: { montebello: { title: 'Montebello', description: '' } } } }
  const cityRace = { districtType: 'city-council', districtCode: 'mb-1', metadata: { scope: { city: 'montebello' } } }
  assert.deepEqual(electionPageFor(election, cityRace), { title: 'Montebello', href: '/elections/ca?city=montebello' })
  assert.deepEqual(electionPageFor(election, { districtType: null, districtCode: null }), { title: 'Both', href: '/elections/ca' })
  assert.deepEqual(electionPageFor({ ...election, metadata: null }, cityRace), { title: 'Both', href: '/elections/ca' })
})
