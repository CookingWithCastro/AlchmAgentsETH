import type { ContextCardPlacement, ContextCardTransits, TransitAspect, TransitMeta } from './types'
import { normalizeSign } from './types'

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
  const norm = normalizeSign(sign)
  const i = SIGN_ORDER.indexOf(norm)
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

export const DEMO_SKY: SkySource = {
  positions: [
    { planet: 'Sun', sign: 'Leo', degree: 0.8 },
    { planet: 'Moon', sign: 'Scorpio', degree: 25.7 },
    { planet: 'Mercury', sign: 'Cancer', degree: 16.3, retrograde: true },
    { planet: 'Venus', sign: 'Virgo', degree: 15.3 },
    { planet: 'Mars', sign: 'Gemini', degree: 17.4 },
    { planet: 'Jupiter', sign: 'Leo', degree: 5.1 },
    { planet: 'Saturn', sign: 'Aries', degree: 14.7 },
    { planet: 'Uranus', sign: 'Gemini', degree: 4.7 },
    { planet: 'Neptune', sign: 'Aries', degree: 4.3, retrograde: true },
    { planet: 'Pluto', sign: 'Aquarius', degree: 4.4, retrograde: true },
  ],
  meta: {
    when: 'Live Transit Sky',
    location: 'Global Observer',
    planetaryHour: 'Mercury',
    moonPhase: 'Waning Gibbous',
    moonIllumination: 0.71,
    dominantPlanet: 'Mercury',
    dominantSign: 'Cancer',
  },
}

/**
 * Computes the transit→natal aspect grid using normalized 0-360° longitudes.
 */
export function computeTransits(
  natalPoints: ContextCardPlacement[],
  sky: SkySource,
  cap = 16
): ContextCardTransits {
  const natalTargets = natalPoints
    .filter(p => TARGET_NAMES.includes(p.body))
    .map(p => ({ body: p.body, sign: normalizeSign(p.sign), deg: p.deg, lon: abs(p.sign, p.deg) }))

  const transitBodies = sky.positions
    .filter(p => TRANSIT_BODIES.includes(p.planet))
    .map(p => ({
      body: p.planet,
      sign: normalizeSign(p.sign),
      deg: p.degree,
      lon: abs(p.sign, p.degree),
      retro: !!p.retrograde,
    }))

  const aspects: TransitAspect[] = []
  for (const t of transitBodies) {
    for (const n of natalTargets) {
      let sep = Math.abs(t.lon - n.lon) % 360
      if (sep > 180) sep = 360 - sep
      const asp = closestAspect(sep)
      if (asp) {
        const diff = (t.lon - n.lon + 360) % 360
        const applying = t.retro ? diff < asp.angle : diff > asp.angle
        aspects.push({
          t: t.body,
          tRetro: t.retro,
          n: n.body,
          type: asp.type,
          orb: asp.orb,
          applying,
        })
      }
    }
  }

  aspects.sort((a, b) => a.orb - b.orb)

  return { meta: sky.meta, aspects: aspects.slice(0, cap) }
}

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

  if (transits.aspects && transits.aspects.length > 0) {
    const top = transits.aspects.slice(0, 3)
    const contacts = top
      .map(
        a =>
          `${a.t}${a.tRetro ? ' (Rx)' : ''} ${ASPECT_VERB[a.type] || 'aspects'} natal ${a.n} (${a.orb}° orb)`
      )
      .join('; ')
    lead.push(`Key active contacts: ${contacts}.`)
  } else {
    lead.push('No major exact transits are currently active.')
  }

  return lead.join(' ')
}
