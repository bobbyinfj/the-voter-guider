// API Route: sign out of this browser (guides stay with the account)
import { NextResponse } from 'next/server'
import { signOut } from '@/lib/auth'
import { handleApiError } from '@/lib/errors'

export async function POST() {
  try {
    await signOut()
    return NextResponse.json({ ok: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
