import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cleanRatings, rankBadges, ratingsOf, withRating, withoutRatings } from '@/lib/guideRatings'
import { badgesFrom, type Badge } from '@/lib/scorecard'

const badge = (guideId: string, by = guideId): Badge => ({ by, kind: 'advocacy', lean: null, label: by, url: null, guideId })

test('hearted guides lead, disliked go last, nothing is dropped and order is otherwise kept', () => {
  const list = [badge('cmp-a'), badge('cmp-b'), badge('cmp-c'), badge('cmp-d')]
  const ranked = rankBadges(list, { 'cmp-c': 'heart', 'cmp-a': 'dislike' })
  assert.deepEqual(
    ranked.map((b) => b.guideId),
    ['cmp-c', 'cmp-b', 'cmp-d', 'cmp-a'],
  )
  assert.equal(ranked[0].rating, 'heart')
  assert.equal(ranked[3].rating, 'dislike')
  assert.equal(ranked[1].rating, undefined)
  // The input isn't changed
  assert.deepEqual(
    list.map((b) => b.guideId),
    ['cmp-a', 'cmp-b', 'cmp-c', 'cmp-d'],
  )
  assert.equal('rating' in list[2], false)
})

test('no ratings, or badges without a guide id (bar ratings), leave the list as it was', () => {
  const bar: Badge = { by: 'LACBA', kind: 'rating', label: 'Qualified', url: null }
  const list = [bar, badge('cmp-a')]
  assert.deepEqual(rankBadges(list, {}), list)
  assert.deepEqual(rankBadges(list, { 'cmp-a': 'dislike' }).map((b) => b.by), ['LACBA', 'cmp-a'])
})

test('badgesFrom carries the template guide id so ratings can find it', () => {
  const map = badgesFrom([
    {
      id: 'cmp-aft-1521',
      title: 'AFT 1521',
      metadata: { comparison: { kind: 'advocacy', lean: 'left', url: 'https://example.org/' } },
      choices: [{ ballotId: 'b1', selection: 'YES', sourceUrl: null, notes: null }],
    },
  ])
  assert.equal(map.b1.YES[0].guideId, 'cmp-aft-1521')
})

test('only heart/dislike on template ids are kept from a request', () => {
  assert.equal(cleanRatings(null), null)
  assert.equal(cleanRatings(['cmp-a']), null)
  assert.equal(cleanRatings('heart'), null)
  assert.deepEqual(
    cleanRatings({ 'cmp-a': 'heart', 'cmp-b': 'dislike', 'cmp-c': 'love', 'someone-elses-guide': 'heart', 'cmp-<x>': 'heart' }),
    { 'cmp-a': 'heart', 'cmp-b': 'dislike' },
  )
  const many = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`cmp-g${i}`, 'heart']))
  assert.equal(Object.keys(cleanRatings(many)!).length, 100)
})

test('setting, changing and clearing a rating', () => {
  let r = withRating({}, 'cmp-a', 'heart')
  r = withRating(r, 'cmp-b', 'dislike')
  r = withRating(r, 'cmp-a', 'dislike')
  assert.deepEqual(r, { 'cmp-a': 'dislike', 'cmp-b': 'dislike' })
  assert.deepEqual(withRating(r, 'cmp-a', null), { 'cmp-b': 'dislike' })
  assert.deepEqual(ratingsOf({ districts: {}, guideRatings: r }), r)
  assert.deepEqual(ratingsOf(null), {})
})

test("ratings are stripped from a guide's metadata for anyone but its owner", () => {
  const metadata = { districts: { city: 'montebello' }, guideRatings: { 'cmp-a': 'heart' } }
  assert.deepEqual(withoutRatings(metadata), { districts: { city: 'montebello' } })
  assert.equal(withoutRatings(null), null)
  const plain = { districts: {} }
  assert.equal(withoutRatings(plain), plain)
})
