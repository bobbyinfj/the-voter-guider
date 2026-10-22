// API Route: use an emailed sign-in link (POST only, so mail scanners that open the link
// can't use it up)
import { NextRequest, NextResponse } from 'next/server'
import { signInWithToken } from '@/lib/auth'
import { getSessionId } from '@/lib/session'
import { handleApiError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const next = await signInWithToken(body.token, await getSessionId())
    if (!next) return NextResponse.json({ error: 'That link has expired or was already used.' }, { status: 400 })
    return NextResponse.json({ next })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
