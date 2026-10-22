// Guide ownership and sign-in input rules
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { defaultKeyFor, isOwner, ownedBy } from '../lib/ownership'
import { normalizeEmail, safeNext } from '../lib/auth-input'

const anon = { sessionId: 's1', userId: null, email: null }
const signedIn = { sessionId: 's1', userId: 'u1', email: 'a@b.co' }

test('signed out, you own only unclaimed guides from this browser', () => {
  assert.deepEqual(ownedBy(anon), { sessionId: 's1', userId: null })
  // Never a bare { userId: null }, which would match every anonymous guide
  assert.ok('sessionId' in ownedBy(anon))
})

test("signed in, you own the account's guides plus this browser's unclaimed ones", () => {
  assert.deepEqual(ownedBy(signedIn), { OR: [{ userId: 'u1' }, { sessionId: 's1', userId: null }] })
})

test('a claimed guide belongs to its account, not the browser that made it', () => {
  assert.equal(isOwner({ sessionId: 's1', userId: 'u2' }, signedIn), false)
  assert.equal(isOwner({ sessionId: 's1', userId: 'u2' }, anon), false)
  assert.equal(isOwner({ sessionId: 's1', userId: null }, anon), true)
  assert.equal(isOwner({ sessionId: null, userId: null }, anon), false)
})

test('one default guide per owner per election', () => {
  assert.equal(defaultKeyFor(anon, 'e1'), 's:s1:e1')
  assert.equal(defaultKeyFor(signedIn, 'e1'), 'u:u1:e1')
})

test('sign-in redirects stay on this site', () => {
  assert.equal(safeNext('/elections/ca-general-2026?city-council=1'), '/elections/ca-general-2026?city-council=1')
  for (const bad of ['//evil.example', 'https://evil.example', '/\\evil.example', 'javascript:alert(1)', null, 42]) {
    assert.equal(safeNext(bad), '/', String(bad))
  }
})

test('emails are trimmed, lower-cased and sanity-checked', () => {
  assert.equal(normalizeEmail('  Me@Example.COM '), 'me@example.com')
  assert.equal(normalizeEmail('not-an-email'), null)
  assert.equal(normalizeEmail(`${'a'.repeat(250)}@b.co`), null)
})
