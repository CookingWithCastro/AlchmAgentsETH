/**
 * Set Primary Natal Chart API
 *
 * Set a specific natal chart as the user's primary chart
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthorizedNatalUserId } from '@/lib/api/natal-chart-guard'
import { setPrimaryChart } from '@/lib/services/natal-chart-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PUT /api/user-natal-charts/[chartId]/set-primary
 * Set chart as primary
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await params
    const body = await request.json()

    const authorized = await resolveAuthorizedNatalUserId(body.userId)
    if ('error' in authorized) return authorized.error
    const userId = authorized.userId

    await setPrimaryChart(chartId, userId)

    return NextResponse.json({
      success: true,
      message: 'Chart set as primary successfully',
    })
  } catch (error) {
    console.error('Error setting primary chart:', error)
    return NextResponse.json(
      {
        error: 'Failed to set primary chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
