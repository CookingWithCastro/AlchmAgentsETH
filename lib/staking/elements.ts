/**
 * Element / ESMS correspondence + the pure astro math that maps a star's (ra, dec)
 * to a zodiac sign and thus to its dominant element.
 *
 * The element↔ESMS pairing is the one already baked into the thermodynamics in
 * lib/spacetime/hooks/useLiveEphemeris (Heat groups spirit²+Fire², Entropy groups
 * substance²+Air², Reactivity's denominator is matter+Earth, essence pairs with Water):
 *
 *   Spirit (0) ↔ Fire    Essence (1) ↔ Water    Matter (2) ↔ Earth    Substance (3) ↔ Air
 */

import type { Element, EsmsId, StakeableStar } from './types'

export const ZODIAC_SIGNS = [
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
] as const

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number]

export const ELEMENT_BY_SIGN: Record<ZodiacSign, Element> = {
  Aries: 'Fire',
  Taurus: 'Earth',
  Gemini: 'Air',
  Cancer: 'Water',
  Leo: 'Fire',
  Virgo: 'Earth',
  Libra: 'Air',
  Scorpio: 'Water',
  Sagittarius: 'Fire',
  Capricorn: 'Earth',
  Aquarius: 'Air',
  Pisces: 'Water',
}

/** Fire→Spirit, Water→Essence, Earth→Matter, Air→Substance. */
export const ELEMENT_TO_ESMS: Record<Element, EsmsId> = {
  Fire: 0,
  Water: 1,
  Earth: 2,
  Air: 3,
}

export const ESMS_NAME: Record<EsmsId, string> = {
  0: 'Spirit',
  1: 'Essence',
  2: 'Matter',
  3: 'Substance',
}

export const ESMS_ELEMENT: Record<EsmsId, Element> = {
  0: 'Fire',
  1: 'Water',
  2: 'Earth',
  3: 'Air',
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

/**
 * Convert equatorial (ra, dec) to ecliptic longitude (degrees). `ra` may be given in
 * hours (|ra|<=24) or degrees — same convention as the live ephemeris.
 */
export function raDecToEclipticLongitude(ra: number, dec: number): number {
  const raDegrees = Math.abs(ra) <= 24 ? ra * 15 : ra
  const rightAscension = (normalizeDegrees(raDegrees) * Math.PI) / 180
  const declination = (dec * Math.PI) / 180
  const obliquity = (23.43928 * Math.PI) / 180

  const longitude = Math.atan2(
    Math.sin(rightAscension) * Math.cos(obliquity) + Math.tan(declination) * Math.sin(obliquity),
    Math.cos(rightAscension)
  )
  return normalizeDegrees((longitude * 180) / Math.PI)
}

export function signOfLongitude(longitude: number): ZodiacSign {
  const idx = Math.floor(normalizeDegrees(longitude) / 30) % ZODIAC_SIGNS.length
  return ZODIAC_SIGNS[idx]
}

export function signOfStar(star: { ra: number; dec: number }): ZodiacSign {
  return signOfLongitude(raDecToEclipticLongitude(star.ra, star.dec))
}

export function elementOfStar(star: { ra: number; dec: number }): Element {
  return ELEMENT_BY_SIGN[signOfStar(star)]
}

export function esmsIdOfStar(star: { ra: number; dec: number }): EsmsId {
  return ELEMENT_TO_ESMS[elementOfStar(star)]
}

/** Enrich a raw SpacetimeDB star_node row into a StakeableStar (adds element + esmsId). */
export function toStakeableStar(row: {
  hipId: number
  name: string
  ra: number
  dec: number
  magnitude: number
  heldBy?: string | null
  regionHint: number
}): StakeableStar {
  const element = elementOfStar(row)
  return {
    hipId: row.hipId,
    name: row.name,
    ra: row.ra,
    dec: row.dec,
    magnitude: row.magnitude,
    heldBy: (row.heldBy as StakeableStar['heldBy']) ?? null,
    regionHint: row.regionHint,
    element,
    esmsId: ELEMENT_TO_ESMS[element],
  }
}
