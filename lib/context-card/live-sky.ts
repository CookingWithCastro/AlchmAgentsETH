import 'server-only'
import { getLegacyPlanetaryPositions } from '@/lib/backend'
import { PlanetaryHourCalculator } from '@/lib/planetary-hour'
import { calculateMoonPhase as moonPhaseObject } from '@/lib/moon-phase-system'
import { calculateMoonIllumination } from '@/lib/moon-phase-calculator'
import { SIGN_ELEMENTS } from './types'
import { DEMO_SKY, type SkySource, type SkyPosition } from './transit-engine'

const DEFAULT_LOC = { lat: 40.7128, lon: -74.006, name: 'New York, NY · 40.71°N 74.01°W' }

const tallyMax = (counts: Record<string, number>): string | null => {
  let best: string | null = null
  let max = -1
  for (const [k, v] of Object.entries(counts)) {
    if (v > max) {
      max = v
      best = k
    }
  }
  return best
}

/**
 * Builds the live "current sky" overlay (transiting positions + planetary hour,
 * moon phase, ruling planet/sign) for a moment, using the same backend
 * ephemeris that powers the rest of the app. Falls back to DEMO_SKY on any
 * failure so the card always renders a complete overlay.
 */
export async function getLiveSky(
  date: Date = new Date(),
  lat: number = DEFAULT_LOC.lat,
  lon: number = DEFAULT_LOC.lon,
  locationName: string = DEFAULT_LOC.name
): Promise<SkySource> {
  try {
    const raw = await getLegacyPlanetaryPositions(date, lat, lon)
    const positions: SkyPosition[] = (raw || [])
      .filter(p => p && p.name && p.sign)
      .map(p => ({ planet: p.name, sign: p.sign, degree: p.degree, retrograde: p.isRetrograde }))

    if (!positions.length) return DEMO_SKY

    // ruling planet of the current hour
    let planetaryHour = 'Sun'
    try {
      planetaryHour = new PlanetaryHourCalculator(lat, lon).getPlanetaryHour(date).planet
    } catch {
      /* keep default */
    }

    // moon phase name + illumination
    const moon = positions.find(p => p.planet === 'Moon')
    let moonPhase = 'Waxing Gibbous'
    try {
      moonPhase = moonPhaseObject(
        date,
        moon ? { sign: moon.sign, degree: moon.degree } : undefined
      ).name
    } catch {
      /* keep default */
    }
    let moonIllumination = 0.5
    try {
      moonIllumination = Math.max(0, Math.min(1, calculateMoonIllumination(date) / 100))
    } catch {
      /* keep default */
    }

    // dominant sign (most-tenanted) + dominant planet (hour ruler)
    const signCounts: Record<string, number> = {}
    const elementCounts: Record<string, number> = {}
    for (const p of positions) {
      signCounts[p.sign] = (signCounts[p.sign] || 0) + 1
      const el = SIGN_ELEMENTS[p.sign]
      if (el) elementCounts[el] = (elementCounts[el] || 0) + 1
    }
    const dominantSign = tallyMax(signCounts) || positions[0].sign

    return {
      positions,
      meta: {
        when: date.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
        location: locationName,
        planetaryHour,
        moonPhase,
        moonIllumination,
        dominantPlanet: planetaryHour,
        dominantSign,
      },
    }
  } catch {
    return DEMO_SKY
  }
}
