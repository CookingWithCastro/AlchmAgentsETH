import { NextResponse } from 'next/server'
import { getCurrentPlanetaryPositions } from '@/lib/calculate-transits'
import { generateAlchmForCurrentMoment } from '@/lib/alchemizer'
import { calculatePhiAxisIndex } from '@/lib/monica/monica-constant-validator'
import { logQuantitiesToGalileo, type AlchemicalMetrics } from '@/lib/galileo-logger'
import { ChartSynthesizer } from '@/lib/consciousness/chart-synthesizer'
import { synthesizeCharts } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const timestamp = new Date().toISOString()

    // Get current planetary positions with error handling
    let positions: any
    try {
      positions = getCurrentPlanetaryPositions(new Date())
    } catch (error) {
      console.error('Error getting planetary positions:', error)
      return NextResponse.json(
        { error: 'Failed to calculate planetary positions', details: String(error) },
        { status: 500 }
      )
    }

    // Generate alchemical data with error handling
    let alchm
    try {
      alchm = await generateAlchmForCurrentMoment()
    } catch (error) {
      console.error('Error generating alchemical data:', error)
      return NextResponse.json(
        { error: 'Failed to generate alchemical data', details: String(error) },
        { status: 500 }
      )
    }

    const planetaryPositions = [
      'Sun',
      'Moon',
      'Mercury',
      'Venus',
      'Mars',
      'Jupiter',
      'Saturn',
      'Uranus',
      'Neptune',
      'Pluto',
      'North Node',
      'Chiron',
      'Ascendant',
      'MC',
    ].map(planet => ({
      planet,
      sign: positions[planet]?.sign || 'Aries',
      degree: parseFloat(String(positions[planet]?.degree || '0')),
      retrograde: Boolean(positions[planet]?.retrograde || false),
    }))

    const spirit = alchm?.['Alchemy Effects']?.['Total Spirit'] || 0
    const essence = alchm?.['Alchemy Effects']?.['Total Essence'] || 0
    const matter = alchm?.['Alchemy Effects']?.['Total Matter'] || 0
    const substance = alchm?.['Alchemy Effects']?.['Total Substance'] || 0

    const fire = alchm?.['Total Effect Value']?.['Fire'] || 0
    const water = alchm?.['Total Effect Value']?.['Water'] || 0
    const air = alchm?.['Total Effect Value']?.['Air'] || 0
    const earth = alchm?.['Total Effect Value']?.['Earth'] || 0

    // Response key kept for API compatibility; the value is the Phi Axis Index, not the
    // thermodynamic Monica (lib/thermodynamics/kalchm.ts).
    const monicaConstant = calculatePhiAxisIndex(
      spirit,
      essence,
      matter,
      substance,
      fire,
      water,
      air,
      earth
    )

    // Build response payload
    const synthesis = synthesizeCharts({
      birthChart: null,
      momentChart: alchm,
    })

    const payload = {
      timestamp,
      planetaryPositions,
      alchmQuantities: {
        spirit,
        essence,
        matter,
        substance,
        Heat: alchm?.['Heat'] || 0,
        Entropy: alchm?.['Entropy'] || 0,
        Reactivity: alchm?.['Reactivity'] || 0,
        Energy: alchm?.['Energy'] || 0,
      },
      monicaConstant,
      synthesis,
    }

    // Log to Galileo for observability
    try {
      const aNumber = spirit + essence + matter + substance
      const metrics: AlchemicalMetrics = {
        quantities: {
          Spirit: payload.alchmQuantities.spirit,
          Essence: payload.alchmQuantities.essence,
          Matter: payload.alchmQuantities.matter,
          Substance: payload.alchmQuantities.substance,
          ANumber: aNumber,
          DayEssence: 0,
          NightEssence: 0,
        },
        dominantElement: alchm?.['Dominant Element'] || '',
        heat: payload.alchmQuantities.Heat || 0,
        entropy: payload.alchmQuantities.Entropy || 0,
        reactivity: payload.alchmQuantities.Reactivity || 0,
        energy: payload.alchmQuantities.Energy || 0,
        sunSign: alchm?.['Sun Sign'] || '',
        chartRuler: alchm?.['Chart Ruler'] || '',
        timestamp,
        planetaryPositions: positions,
      }

      await logQuantitiesToGalileo(metrics, {
        api_endpoint: '/api/philosophers-stone/positions',
        request_timestamp: timestamp,
        calculation_method: 'real-time-planetary-positions+alchemizer',
        monica_constant: payload.monicaConstant,
      })
    } catch (e) {
      console.warn('[Galileo] positions logging failed (non-fatal):', e)
    }

    return NextResponse.json(payload)
  } catch (error) {
    console.error('Error in positions endpoint:', error)
    return NextResponse.json({ error: 'Failed to compute current positions' }, { status: 500 })
  }
}
