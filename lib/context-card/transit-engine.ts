import type { ContextCardPlacement, ContextCardTransits, TransitAspect, TransitMeta } from './types'

const SIGN_ORDER = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const signIndex = (sign: string) => {
  const i = SIGN_ORDER.indexOf(sign)
  return i < 0 ? 0 : i
}

const abs = (sign: string, deg: number) => signIndex(sign) * 30 + deg

/** Transiting bodies actually plotted on the outer ring / used as transit sources. */
const TRANSIT_BODIES = [
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
]

/** Natal bodies used as transit targets (planets + key angles/points). */
const TARGET_NAMES = [
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
  'Ascendant',
  'Midheaven',
  'North Node',
  'Chiron',
]

const ASPECT_DEFS = [
  { type: 'conjunction', angle: 0, orb: 8 },
  { type: 'opposition', angle: 180, orb: 8 },
  { type: 'trine', angle: 120, orb: 7 },
  { type: 'square', angle: 90, orb: 7 },
  { type: 'sextile', angle: 60, orb: 5 },
  { type: 'quincunx', angle: 150, orb: 3 },
]

function closestAspect(sep: number): { type: string; angle: number; orb: number } | null {
  let best: { type: string; angle: number; orb: number } | null = null
  for (const d of ASPECT_DEFS) {
    const delta = Math.abs(sep - d.angle)
    if (delta <= d.orb && (!best || delta < best.orb)) {
      best = { type: d.type, angle: d.angle, orb: Math.round(delta * 10) / 10 }
    }
  }
  return best
}

export interface SkyPosition {
  planet: string
  sign: string
  degree: number
  retrograde?: boolean
}

export interface SkySource {
  positions: SkyPosition[]
  meta: TransitMeta
}

/**
 * Computes the transit→natal aspect grid: the current sky overlaid on a natal
 * chart. Pure function — feed it live positions or static demo data.
 */
export function computeTransits(
  natalPoints: ContextCardPlacement[],
  sky: SkySource,
  cap = 16
): ContextCardTransits {
  const natalTargets = natalPoints
    .filter(p => TARGET_NAMES.includes(p.body))
    .map(p => ({ body: p.body, lon: abs(p.sign, p.deg) }))

  const transitBodies = sky.positions
    .filter(p => TRANSIT_BODIES.includes(p.planet))
    .map(p => ({ body: p.planet, lon: abs(p.sign, p.degree), retro: !!p.retrograde }))

  const aspects: TransitAspect[] = []
  for (const t of transitBodies) {
    for (const n of natalTargets) {
      let sep = Math.abs(t.lon - n.lon) % 360
      if (sep > 180) sep = 360 - sep
      const asp = closestAspect(sep)
      if (asp) {
        aspects.push({ t: t.body, tRetro: t.retro, n: n.body, type: asp.type, orb: asp.orb })
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)

  return { meta: sky.meta, aspects: aspects.slice(0, cap) }
}

/**
 * Authored one-line framing of the live synergy, built from the tightest contacts.
 */
const ASPECT_VERB: Record<string, string> = {
  conjunction: 'is meeting',
  opposition: 'is opposing',
  trine: 'is harmonizing with',
  square: 'is pressuring',
  sextile: 'is opening',
  quincunx: 'is adjusting',
}

export function synergyLead(transits: ContextCardTransits): string {
  const m = transits.meta
  const lead: string[] = []
  lead.push(
    `Right now — ${m.when}, ${m.planetaryHour} hour, ${m.moonPhase} Moon — the sky is activating this chart's most charged points.`
  )
  const top = transits.aspects
    .slice(0, 3)
    .map(
      a => `transiting ${a.t} ${ASPECT_VERB[a.type] || 'is contacting'} natal ${a.n} (${a.orb}°)`
    )
  if (top.length) lead.push('Tightest contacts: ' + top.join('; ') + '.')
  return lead.join(' ')
}

/**
 * Static fallback sky — the current-moment positions used when live planetary
 * data is unavailable. Mirrors the Council Feed's chart-of-the-moment vibe
 * (Mars in Scorpio ruling) so the card always renders a complete overlay.
 */
export const DEMO_SKY: SkySource = {
  positions: [
    { planet: 'Sun', sign: 'Taurus', degree: 28.4, retrograde: false },
    { planet: 'Moon', sign: 'Libra', degree: 12.1, retrograde: false },
    { planet: 'Mercury', sign: 'Taurus', degree: 15.7, retrograde: false },
    { planet: 'Venus', sign: 'Aries', degree: 6.2, retrograde: false },
    { planet: 'Mars', sign: 'Scorpio', degree: 14.0, retrograde: false },
    { planet: 'Jupiter', sign: 'Cancer', degree: 3.5, retrograde: false },
    { planet: 'Saturn', sign: 'Pisces', degree: 28.9, retrograde: false },
    { planet: 'Uranus', sign: 'Gemini', degree: 2.8, retrograde: false },
    { planet: 'Neptune', sign: 'Aries', degree: 4.1, retrograde: false },
    { planet: 'Pluto', sign: 'Aquarius', degree: 3.7, retrograde: true },
  ],
  meta: {
    when: 'the current moment',
    location: 'New York, NY · 40.71°N 74.01°W',
    planetaryHour: 'Mars',
    moonPhase: 'Waxing Gibbous',
    moonIllumination: 0.78,
    dominantPlanet: 'Mars',
    dominantSign: 'Scorpio',
  },
}
