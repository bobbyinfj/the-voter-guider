// API Route: email a sign-in link
import { NextRequest, NextResponse } from 'next/server'
import { getSessionId } from '@/lib/session'
import { handleApiError } from '@/lib/errors'
import { RateLimited, requestSignInLink } from '@/lib/auth'
import { emailEnabled } from '@/lib/mail'

// POST { email, next? }. The answer never says whether the email already has an account.
export async function POST(request: NextRequest) {
  try {
    if (!emailEnabled()) {
      return NextResponse.json({ error: "Email sign-in isn't switched on yet." }, { status: 503 })
    }
    const body = await request.json()
    const result = await requestSignInLink(body.email, await getSessionId(), body.next)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof RateLimited) {
      return NextResponse.json({ error: 'Too many sign-in links. Please wait a few minutes.' }, { status: 429 })
    }
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
