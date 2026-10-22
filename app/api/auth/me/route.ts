// API Route: who's signed in (if anyone), and whether email sign-in is available
import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'
import { emailEnabled } from '@/lib/mail'
import { handleApiError } from '@/lib/errors'

export async function GET() {
  try {
    const user = await currentUser()
    return NextResponse.json({ email: user?.email ?? null, emailEnabled: emailEnabled() })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
