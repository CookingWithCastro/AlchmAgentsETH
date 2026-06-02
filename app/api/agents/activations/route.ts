import { NextRequest, NextResponse } from 'next/server'
import { getAgentActivations, getFallbackAgentActivations } from '@/lib/agents/activations'

export const dynamic = 'force-dynamic'

const RESPONSE_DEADLINE_MS = 3250

export async function GET(request: NextRequest) {
  const startedAt = Date.now()
  const { searchParams } = new URL(request.url)
  const rawDate = searchParams.get('date')
  const date = rawDate ? new Date(rawDate) : new Date()
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || 12)))

  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date parameter' }, { status: 400 })
  }

  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<ReturnType<typeof getFallbackAgentActivations>>(resolve => {
    timeoutId = setTimeout(() => {
      timedOut = true
      resolve(getFallbackAgentActivations(date, limit))
    }, RESPONSE_DEADLINE_MS)
  })

  const activations = await Promise.race([getAgentActivations(date, limit), timeout])
  if (timeoutId) clearTimeout(timeoutId)

  return NextResponse.json({
    activations,
    meta: {
      date: date.toISOString(),
      elapsedMs: Date.now() - startedAt,
      timedOut,
    },
  })
}
