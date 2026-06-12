/**
 * User Natal Charts API
 *
 * CRUD operations for user natal charts
 */

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthorizedNatalUserId } from '@/lib/api/natal-chart-guard'
import {
  createNatalChart,
  getUserNatalCharts,
  getPrimaryNatalChart,
  CreateNatalChartInput,
} from '@/lib/services/natal-chart-storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/user-natal-charts
 * Get all natal charts for a user or just the primary chart
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const primaryOnly = searchParams.get('primaryOnly') === 'true'
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const authorized = await resolveAuthorizedNatalUserId(searchParams.get('userId'))
    if ('error' in authorized) return authorized.error
    const userId = authorized.userId

    if (primaryOnly) {
      const chart = await getPrimaryNatalChart(userId)
      return NextResponse.json({ chart })
    }

    const charts = await getUserNatalCharts(userId, activeOnly)
    return NextResponse.json({ charts })
  } catch (error) {
    console.error('Error fetching natal charts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch natal charts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user-natal-charts
 * Create a new natal chart
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const authorized = await resolveAuthorizedNatalUserId(body.userId)
    if ('error' in authorized) return authorized.error
    body.userId = authorized.userId

    // Validate required fields
    const requiredFields = ['userId', 'chartName', 'birthDate', 'birthTime', 'birthLocation']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate birthLocation structure
    if (
      !body.birthLocation.name ||
      typeof body.birthLocation.lat !== 'number' ||
      typeof body.birthLocation.lon !== 'number'
    ) {
      return NextResponse.json(
        { error: 'birthLocation must include name (string), lat (number), and lon (number)' },
        { status: 400 }
      )
    }

    // Convert birthDate to Date object
    const birthDate = new Date(body.birthDate)
    if (isNaN(birthDate.getTime())) {
      return NextResponse.json({ error: 'Invalid birthDate format' }, { status: 400 })
    }

    const input: CreateNatalChartInput = {
      userId: body.userId,
      chartName: body.chartName,
      description: body.description,
      birthDate,
      birthTime: body.birthTime,
      birthLocation: body.birthLocation,
      preferences: body.preferences,
    }

    const chart = await createNatalChart(input)

    return NextResponse.json({
      success: true,
      chart,
      message: 'Natal chart created successfully',
    })
  } catch (error) {
    console.error('Error creating natal chart:', error)
    return NextResponse.json(
      {
        error: 'Failed to create natal chart',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/user-natal-charts
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
