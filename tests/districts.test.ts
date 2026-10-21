import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NO_RACE, districtOptions, matchesSelection, parseDistrictSelection } from '@/lib/districts'

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
