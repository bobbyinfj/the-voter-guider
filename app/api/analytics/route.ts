// API Route: Share guide analytics
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/errors'

const EVENT_TYPES = new Set(['share', 'copy', 'view'])

// Counts share events only — no IP addresses or other identifying data are stored
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (typeof body.guideId !== 'string') {
      return NextResponse.json({ error: 'guideId required' }, { status: 400 })
    }
    const guide = await prisma.guide.findUnique({ where: { id: body.guideId }, select: { id: true } })
    if (!guide) return NextResponse.json({ error: 'Guide not found' }, { status: 404 })

    await prisma.guideAnalytics.create({
      data: {
        guideId: guide.id,
        eventType: EVENT_TYPES.has(body.eventType) ? body.eventType : 'share',
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    const { message, statusCode } = handleApiError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
