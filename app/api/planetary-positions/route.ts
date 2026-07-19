import { NextRequest, NextResponse } from 'next/server'
import { getAlchemicalQuantitiesLegacy, getLegacyPlanetaryPositions } from '@/lib/backend'
import { calculateStarHorizonPositions } from '@/lib/enhanced-astronomical-calculator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseDate(value: unknown): Date {
  if (typeof value !== 'string' || value.trim() === '') return new Date()

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date format')
  }

  return date
}

function parseCoordinate(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizePosition(position: { name: string }) {
  return {
    planet: position.name,
    ...position,
  }
}

async function buildResponse(params: {
  date?: unknown
  latitude?: unknown
  longitude?: unknown
  includeAlchemy?: unknown
}) {
  const date = parseDate(params.date)
  const latitude = parseCoordinate(params.latitude) ?? 40.7128
  const longitude = parseCoordinate(params.longitude) ?? -74.006
  const includeAlchemy = params.includeAlchemy !== false && params.includeAlchemy !== 'false'

  const [positions, alchmQuantities] = await Promise.all([
    getLegacyPlanetaryPositions(date, latitude, longitude),
    includeAlchemy
      ? getAlchemicalQuantitiesLegacy(date, latitude, longitude)
      : Promise.resolve(null),
  ])

  const starPositions = calculateStarHorizonPositions(date, latitude, longitude)

  return {
    success: true,
    timestamp: date.toISOString(),
    planetaryPositions: positions.map(normalizePosition),
    starPositions,
    alchmQuantities,
    source: 'railway-backend',
    accuracy: 'high',
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const payload = await buildResponse({
      date: searchParams.get('date'),
      latitude: searchParams.get('latitude') ?? searchParams.get('lat'),
      longitude: searchParams.get('longitude') ?? searchParams.get('lon'),
      includeAlchemy: searchParams.get('includeAlchemy'),
    })

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate planetary positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const payload = await buildResponse({
      date: body.date,
      latitude: body.latitude ?? body.lat,
      longitude: body.longitude ?? body.lon,
      includeAlchemy: body.includeAlchemy,
    })

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate planetary positions',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
