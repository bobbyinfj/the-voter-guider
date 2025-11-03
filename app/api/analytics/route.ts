// API Route: Share guide analytics
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const headers = request.headers

    await prisma.guideAnalytics.create({
      data: {
        guideId: body.guideId,
        eventType: body.eventType || 'share',
        ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
        userAgent: headers.get('user-agent') || undefined,
        referrer: body.referrer || undefined,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error tracking analytics:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics' },
      { status: 500 }
    )
  }
}

