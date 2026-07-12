import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://api.agents.alchm.kitchen'

interface BirthChartData {
  name?: string
}

function getBackendUrl(path: string) {
  return `${BACKEND_URL.replace(/\/$/, '')}${path}`
}

function generateFallbackConsciousnessData(birthChart: BirthChartData) {
  const name = birthChart.name || 'Unknown Agent'
  const nameHash = name.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0)
    return a & a
  }, 0)

  const r = Math.abs(nameHash) / 2147483647
  const birthMC = 2.0 + r * 3.0
  const liveDelta = (r - 0.5) * 0.6
  const liveMC = Math.max(0.5, birthMC + liveDelta)
  const mcChange = liveMC - birthMC
  const mcPercentChange = birthMC !== 0 ? (mcChange / birthMC) * 100 : 0
  const birthKalchm = {
    spirit: 2 + r * 4,
    essence: 2 + r * 4,
    matter: 2 + r * 4,
    substance: 1 + r * 3,
    aNumber: 20 + Math.floor(r * 40),
  }
  const liveKalchm = {
    spirit: birthKalchm.spirit + liveDelta * 5,
    essence: birthKalchm.essence + liveDelta * 4,
    matter: birthKalchm.matter + liveDelta * 3,
    substance: birthKalchm.substance + liveDelta * 2,
    aNumber: birthKalchm.aNumber + Math.floor(liveDelta * 10),
  }
  const levels = ['Awakening', 'Active', 'Elevated', 'Advanced', 'Illuminated'] as const
  const idx = Math.min(levels.length - 1, Math.floor(r * levels.length))
  const consciousnessLevel = levels[idx]
  const liveConsciousnessLevel = levels[Math.min(levels.length - 1, idx + (liveDelta > 0 ? 1 : 0))]

  return {
    birthMC,
    birthKalchm,
    liveMC,
    liveKalchm,
    mcChange,
    mcPercentChange,
    dominantTransitEffect: 'fallback',
    consciousnessLevel,
    liveConsciousnessLevel,
    interpretations: {
      mcChange:
        mcChange > 0
          ? 'Consciousness rising in fallback context'
          : mcChange < 0
            ? 'Minor contraction observed'
            : 'Stable consciousness',
      transitInfluence: 'Transit influence approximated (fallback)',
      cosmicWeather: 'Calm cosmic conditions (fallback)',
    },
    timestamp: new Date().toISOString(),
    calculationTime: 0,
    fromCache: false,
  }
}

async function proxyConsciousnessRequest(path: string, body: unknown) {
  try {
    const response = await fetch(getBackendUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })

    // Backend doesn't implement this route → signal client to use its local fallback
    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        degraded: true,
        data: generateFallbackConsciousnessData(body as BirthChartData),
      })
    }

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      return NextResponse.json(
        payload || {
          error: 'Backend consciousness calculation failed',
          code: 'BACKEND_ERROR',
        },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: payload,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Backend consciousness service unavailable',
        code: 'BACKEND_DISABLED',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return proxyConsciousnessRequest('/api/consciousness/live', body)
}

export async function GET(request: NextRequest) {
  try {
    const defaultBody = {
      name: 'Current Moment',
      birthDate: new Date().toISOString().slice(0, 10),
      birthTime: '12:00',
      birthLocation: { name: 'Greenwich, UK', lat: 51.4779, lon: 0.0 },
    }
    return proxyConsciousnessRequest('/api/consciousness/live', defaultBody)
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Backend consciousness service unavailable',
        code: 'BACKEND_DISABLED',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    )
  }
}
