import { test } from 'node:test'
import assert from 'node:assert/strict'
import { bracketStart, hasJoint, rateAt, taxOn, taxRatesFor } from '../lib/taxRates'
import { isHttpUrl } from '../lib/profile'

const prop3 = taxRatesFor('ca26-m-prop-3')!

test('Prop 3 brackets are sourced, ascending, and only differ above the top 9.3% bracket', () => {
  assert.ok(isHttpUrl(prop3.source.url) && isHttpUrl(prop3.source.figure) && prop3.source.figureSha256)
  for (const f of ['single', 'joint'] as const)
    prop3.brackets.forEach((b, i) => i && assert.ok(bracketStart(b, f) > bracketStart(prop3.brackets[i - 1], f), `${f} bracket ${i} out of order`))
  for (const b of prop3.brackets) {
    assert.equal(b.now, b.yes) // approval keeps today's rates
    if (b.single < 371_000) assert.equal(b.yes, b.no)
  }
})

test('rates and tax at a given income', () => {
  const B = prop3.brackets
  assert.equal(rateAt(B, 'single', 100_000, 'yes'), 9.3)
  assert.equal(rateAt(B, 'single', 800_000, 'yes'), 12.3)
  assert.equal(rateAt(B, 'single', 800_000, 'no'), 9.3)
  assert.equal(rateAt(B, 'joint', 800_000, 'yes'), 10.3)
  // Single, $500k: 1 point on $371k-$446k + 2 points on $446k-$500k = $750 + $1,080
  assert.equal(Math.round(taxOn(B, 'single', 500_000, 'yes') - taxOn(B, 'single', 500_000, 'no')), 1830)
  assert.equal(taxOn(B, 'single', 300_000, 'yes'), taxOn(B, 'single', 300_000, 'no'))
  assert.equal(taxRatesFor('no-such-measure'), undefined)
})

test("Amendment 87 matches the Blue Book's own examples", () => {
  const a87 = taxRatesFor('co26-m-amendment-87')!
  assert.equal(hasJoint(a87), false) // one schedule for every filer
  const diff = (income: number) => Math.round(taxOn(a87.brackets, 'single', income, 'yes') - taxOn(a87.brackets, 'single', income, 'no'))
  // Blue Book table: $125,000 owes $5,175 vs $5,500; $550,000 +$1,175; $2,000,000 +$55,925
  assert.equal(Math.round(taxOn(a87.brackets, 'single', 125_000, 'yes')), 5175)
  assert.equal(diff(125_000), -325)
  assert.equal(diff(550_000), 1175)
  assert.equal(diff(2_000_000), 55925)
  assert.equal(taxOn(a87.brackets, 'joint', 125_000, 'yes'), taxOn(a87.brackets, 'single', 125_000, 'yes'))
})
