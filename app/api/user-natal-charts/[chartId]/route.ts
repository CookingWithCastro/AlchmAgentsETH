/**
 * Individual Natal Chart API
 *
 * Operations for specific natal chart by ID
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthorizedNatalUserId } from '@/lib/api/natal-chart-guard'
import {
  getNatalChart,
  updateNatalChart,
  deleteNatalChart,
  setPrimaryChart,
  UpdateNatalChartInput,
} from '@/lib/services/natal-chart-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/user-natal-charts/[chartId]
 * Get specific natal chart by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await params
    const { searchParams } = new URL(request.url)

    const authorized = await resolveAuthorizedNatalUserId(searchParams.get('userId'))
    if ('error' in authorized) return authorized.error
    const userId = authorized.userId

    const chart = await getNatalChart(chartId, userId)

    if (!chart) {
      return NextResponse.json({ error: 'Natal chart not found' }, { status: 404 })
    }

    return NextResponse.json({ chart })
  } catch (error) {
    console.error('Error fetching natal chart:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch natal chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user-natal-charts/[chartId]
 * Update natal chart
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

    // Handle setPrimary action separately
    if (body.action === 'setPrimary') {
      await setPrimaryChart(chartId, userId)
      return NextResponse.json({ success: true, message: 'Chart set as primary' })
    }

    // Regular update
    const updates: UpdateNatalChartInput = {}

    if (body.chartName !== undefined) updates.chartName = body.chartName
    if (body.description !== undefined) updates.description = body.description
    if (body.preferences !== undefined) updates.preferences = body.preferences
    if (body.notificationOn !== undefined) updates.notificationOn = body.notificationOn

    const chart = await updateNatalChart(chartId, userId, updates)

    return NextResponse.json({
      success: true,
      chart,
      message: 'Natal chart updated successfully',
    })
  } catch (error) {
    console.error('Error updating natal chart:', error)
    return NextResponse.json(
      {
        error: 'Failed to update natal chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/user-natal-charts/[chartId]
 * Delete (soft delete) natal chart
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ chartId: string }> }
) {
  try {
    const { chartId } = await params
    const { searchParams } = new URL(request.url)

    const authorized = await resolveAuthorizedNatalUserId(searchParams.get('userId'))
    if ('error' in authorized) return authorized.error
    const userId = authorized.userId

    await deleteNatalChart(chartId, userId)

    return NextResponse.json({
      success: true,
      message: 'Natal chart deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting natal chart:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete natal chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/user-natal-charts/[chartId]
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
