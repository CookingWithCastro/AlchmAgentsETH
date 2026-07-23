import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getPrimaryNatalChart, getUserNatalCharts } from '@/lib/services/natal-chart-storage'
import { DEMO_CARD_DATA } from '@/lib/context-card/demo-data'
import { buildContextCardDataFromChart } from '@/lib/context-card/from-natal-chart'
import { getLiveSky } from '@/lib/context-card/live-sky'
import { computeTransits, DEMO_SKY, type SkySource } from '@/lib/context-card/transit-engine'
import type { ContextCardData } from '@/lib/context-card/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    let data: ContextCardData = DEMO_CARD_DATA
    let isPrimaryChart = false
    let userCharts: any[] = []
    let loc: { lat?: number; lon?: number; name?: string } | null = null

    try {
      const session = await auth()
      const userId = session?.user?.id
      if (userId) {
        const primaryChart = await getPrimaryNatalChart(userId)
        if (primaryChart) {
          data = await buildContextCardDataFromChart(
            primaryChart as Parameters<typeof buildContextCardDataFromChart>[0]
          )
          isPrimaryChart = true
          const bl = (
            primaryChart as { birthLocation?: { lat?: number; lon?: number; name?: string } }
          ).birthLocation
          if (bl && typeof bl.lat === 'number') loc = bl
        }

        const allCharts = await getUserNatalCharts(userId, true)
        userCharts = (allCharts || []).map(c => ({
          id: c.id,
          chartName: c.chartName,
          birthDate: c.birthDate,
          birthTime: c.birthTime,
          birthLocation: c.birthLocation,
          isPrimary: c.isPrimary,
        }))
      }
    } catch (chartErr) {
      console.warn('[api/context-card/generate] could not load user natal chart:', chartErr)
    }

    let sky: SkySource = DEMO_SKY
    try {
      sky = await getLiveSky(new Date(), loc?.lat, loc?.lon, loc?.name)
    } catch {
      sky = DEMO_SKY
    }

    data = { ...data, transits: computeTransits(data.points, sky) }

    return NextResponse.json({
      success: true,
      data,
      isPrimaryChart,
      userCharts,
      skyTimestamp: sky.meta?.when || new Date().toISOString(),
    })
  } catch (error) {
    console.error('[api/context-card/generate] Error generating chart data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate chart data',
        data: DEMO_CARD_DATA,
        isPrimaryChart: false,
        userCharts: [],
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { chartName, birthDate, birthTime, birthLocation } = body || {}

    const customChart = {
      chartName: chartName || 'Custom Chart',
      birthDate: birthDate || new Date().toISOString().split('T')[0],
      birthTime: birthTime || '12:00',
      birthLocation: {
        name: birthLocation?.name || 'Custom Location',
        lat: typeof birthLocation?.lat === 'number' ? birthLocation.lat : 40.7128,
        lon: typeof birthLocation?.lon === 'number' ? birthLocation.lon : -74.006,
      },
    }

    let data: ContextCardData = await buildContextCardDataFromChart(customChart)
    let sky: SkySource = DEMO_SKY
    try {
      sky = await getLiveSky(
        new Date(),
        customChart.birthLocation.lat,
        customChart.birthLocation.lon,
        customChart.birthLocation.name
      )
    } catch {
      sky = DEMO_SKY
    }

    data = { ...data, transits: computeTransits(data.points, sky) }

    return NextResponse.json({
      success: true,
      data,
      chart: customChart,
      skyTimestamp: sky.meta?.when || new Date().toISOString(),
    })
  } catch (error) {
    console.error('[api/context-card/generate] POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate custom chart',
      },
      { status: 500 }
    )
  }
}
