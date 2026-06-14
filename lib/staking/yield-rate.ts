/**
 * The multiplicative star-staking yield rate:
 *
 *   dailyRatePerUsdc = BASE_DAILY_RATE
 *                      × zoneDominance     (how elementally dominant the sky is for the
 *                                           star's element right now)
 *                      × chartAffinity     (the staker's natal affinity to that element)
 *                      × planetDignity     (dignity of the planet transiting the star's sign)
 *                      × visible           (1 only while the star is above the horizon)
 *
 * Every input is read from data the repo already produces: live transiting positions
 * (useLiveEphemeris / the REST ephemeris), the staker's user_natal_charts row, and the
 * star's (ra, dec). The result is signed by the attestor and minted as ESMS on claim.
 */

import { ELEMENT_BY_SIGN, ELEMENT_TO_ESMS, signOfStar, type ZodiacSign } from './elements'
import { starAltitude } from './visibility'
import type { Element, LivePlanet, PlanetName, YieldRateBreakdown, YieldRateInputs } from './types'

/** Base ESMS minted per USDC per day before multipliers (≈22% headline at neutral). */
export const BASE_DAILY_RATE = Number(process.env.STAKING_BASE_DAILY_RATE ?? '0.0006')

/** Planet → its elemental affinities (compact form of ALCHEMY_BY_PLANET.elements). */
const PLANET_ELEMENTS: Record<PlanetName, Element[]> = {
  Sun: ['Fire'],
  Moon: ['Water'],
  Mercury: ['Air', 'Earth'],
  Venus: ['Water', 'Earth'],
  Mars: ['Fire', 'Water'],
  Jupiter: ['Air', 'Fire'],
  Saturn: ['Air', 'Earth'],
  Uranus: ['Water', 'Air'],
  Neptune: ['Water'],
  Pluto: ['Earth', 'Water'],
}

/** Essential dignities by planet+sign (mirrors useLiveEphemeris's ALCHEMY_BY_PLANET.dignity). */
const PLANET_DIGNITY: Record<PlanetName, Partial<Record<ZodiacSign, number>>> = {
  Sun: { Leo: 1, Aries: 2, Aquarius: -1, Libra: -2 },
  Moon: { Cancer: 1, Taurus: 2, Capricorn: -1, Scorpio: -2 },
  Mercury: { Gemini: 1, Virgo: 3, Sagittarius: 1, Pisces: -3 },
  Venus: { Libra: 1, Taurus: 1, Pisces: 2, Aries: -1, Scorpio: -1, Virgo: -2 },
  Mars: { Aries: 1, Scorpio: 1, Capricorn: 2, Taurus: -1, Libra: -1, Cancer: -2 },
  Jupiter: { Pisces: 1, Sagittarius: 1, Cancer: 2, Gemini: -1, Virgo: -1, Capricorn: -2 },
  Saturn: { Aquarius: 1, Capricorn: 1, Libra: 2, Cancer: -1, Leo: -1, Aries: -2 },
  Uranus: { Aquarius: 1, Scorpio: 2, Taurus: -3 },
  Neptune: { Pisces: 1, Cancer: 2, Virgo: -1, Capricorn: -2 },
  Pluto: { Scorpio: 1, Leo: 2, Taurus: -1, Aquarius: -2 },
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

/**
 * Sky elemental dominance for `element`: the share of transiting planets whose sign (and
 * own elemental affinity) reinforces that element, mapped to a ~0.5..2.0 multiplier.
 */
export function zoneDominanceFor(element: Element, planets: LivePlanet[]): number {
  if (planets.length === 0) return 1
  let score = 0
  let total = 0
  for (const p of planets) {
    const signElement = ELEMENT_BY_SIGN[p.sign as ZodiacSign]
    const affinity = PLANET_ELEMENTS[p.planet] ?? []
    const weight = 1
    total += weight
    if (signElement === element) score += weight
    if (affinity.includes(element)) score += weight * 0.5
  }
  const share = total > 0 ? score / total : 0
  return clamp(0.5 + share * 1.5, 0.5, 2.0)
}

/** Staker's natal affinity to the star's element, ~0.5..2.5 (1.0 when no chart). */
export function chartAffinityFor(element: Element, natal?: YieldRateInputs['natal']): number {
  if (!natal) return 1
  let affinity = 0.75
  if (natal.dominantElement && String(natal.dominantElement) === element) affinity += 0.5

  const scoreByElement: Record<Element, number | null | undefined> = {
    Fire: natal.spiritScore,
    Water: natal.essenceScore,
    Earth: natal.matterScore,
    Air: natal.substanceScore,
  }
  const raw = scoreByElement[element]
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    affinity += clamp(raw / 100, 0, 1) * 0.5
  }
  if (typeof natal.monicaConstant === 'number') {
    affinity += clamp(natal.monicaConstant, 0, 1) * 0.5
  }
  return clamp(affinity, 0.5, 2.5)
}

/**
 * Dignity multiplier from the planet(s) transiting the star's sign: 1 + Σ|dignity|×0.1,
 * capped at 2.0. Conjunct, dignified planets pump a star's yield.
 */
export function planetDignityFor(starSign: ZodiacSign, planets: LivePlanet[]): number {
  let bonus = 0
  for (const p of planets) {
    if (p.sign !== starSign) continue
    const dignity = PLANET_DIGNITY[p.planet]?.[starSign] ?? 0
    bonus += Math.abs(dignity)
  }
  return clamp(1 + bonus * 0.1, 1, 2)
}

/** Compute the full yield-rate breakdown for one star + staker at an instant. */
export function computeYieldRate(inputs: YieldRateInputs): YieldRateBreakdown {
  const { star, planets, natal, observer, at = new Date() } = inputs
  const element = star.element
  const esmsId = ELEMENT_TO_ESMS[element]

  // The star's exact sign drives the dignity check for any planet conjunct it.
  const sign = signOfStar(star)

  const zoneDominance = zoneDominanceFor(element, planets)
  const chartAffinity = chartAffinityFor(element, natal)
  const planetDignity = planetDignityFor(sign, planets)

  let altitudeDeg = 90
  let visible = true
  if (observer) {
    const alt = starAltitude(star.ra, star.dec, observer.lat, observer.lon, at)
    altitudeDeg = alt.altitudeDeg
    visible = alt.visible
  }

  const dailyRatePerUsdc =
    BASE_DAILY_RATE * zoneDominance * chartAffinity * planetDignity * (visible ? 1 : 0)

  return {
    esmsId,
    element,
    baseDailyRate: BASE_DAILY_RATE,
    zoneDominance,
    chartAffinity,
    planetDignity,
    visible,
    altitudeDeg,
    dailyRatePerUsdc,
    apyPct: dailyRatePerUsdc * 365 * 100,
  }
}

/** ESMS (18-dp) accrued for a window: principal(USDC) × dailyRate × visibleDays. */
export function accruedEsms(
  principalUsdc: number,
  dailyRatePerUsdc: number,
  elapsedVisibleSeconds: number
): bigint {
  const days = elapsedVisibleSeconds / 86_400
  const amount = principalUsdc * dailyRatePerUsdc * days
  if (!Number.isFinite(amount) || amount <= 0) return 0n
  // Scale to 18-dp ESMS.
  return BigInt(Math.floor(amount * 1e18))
}
