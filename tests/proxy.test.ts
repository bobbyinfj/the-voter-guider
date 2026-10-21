import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'
import { SESSION_COOKIE } from '@/lib/session-cookie'

test('a first visit gets one httpOnly session cookie, also visible to the handler', () => {
  const res = proxy(new NextRequest('http://localhost/guides'))
  const set = res.cookies.get(SESSION_COOKIE)
  assert.match(set?.value ?? '', /^[0-9a-f-]{36}$/)
  assert.equal(set?.httpOnly, true)
  // Forwarded to the page/API handler in the same request, so it doesn't mint another
  assert.match(res.headers.get('x-middleware-request-cookie') ?? '', new RegExp(`${SESSION_COOKIE}=${set?.value}`))
})

test('an existing session is left alone', () => {
  const req = new NextRequest('http://localhost/guides', { headers: { cookie: `${SESSION_COOKIE}=abc` } })
  assert.equal(proxy(req).cookies.get(SESSION_COOKIE), undefined)
})
