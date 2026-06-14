/**
 * Fallback bright-star catalog — real Hipparcos stars with real (ra hours, dec deg) and
 * magnitudes. Used when the live SpacetimeDB `star_node` feed is empty or disabled, so
 * the pentacle map always renders. Live rows (matched by hipId) take precedence.
 */

import { toStakeableStar } from './elements'
import type { StakeableStar } from './types'

interface RawStar {
  hipId: number
  name: string
  ra: number // hours
  dec: number // degrees
  magnitude: number
  regionHint: number // 0..10 pentacle zone
}

const RAW_STARS: RawStar[] = [
  { hipId: 32349, name: 'Sirius', ra: 6.7525, dec: -16.7161, magnitude: -1.46, regionHint: 0 },
  { hipId: 69673, name: 'Arcturus', ra: 14.2612, dec: 19.1825, magnitude: -0.05, regionHint: 1 },
  { hipId: 91262, name: 'Vega', ra: 18.6156, dec: 38.7837, magnitude: 0.03, regionHint: 2 },
  { hipId: 24608, name: 'Capella', ra: 5.278, dec: 45.998, magnitude: 0.08, regionHint: 3 },
  { hipId: 24436, name: 'Rigel', ra: 5.2423, dec: -8.2017, magnitude: 0.13, regionHint: 4 },
  { hipId: 37279, name: 'Procyon', ra: 7.6551, dec: 5.225, magnitude: 0.34, regionHint: 5 },
  { hipId: 27989, name: 'Betelgeuse', ra: 5.9195, dec: 7.407, magnitude: 0.42, regionHint: 6 },
  { hipId: 21421, name: 'Aldebaran', ra: 4.5987, dec: 16.5093, magnitude: 0.85, regionHint: 7 },
  { hipId: 97649, name: 'Altair', ra: 19.8464, dec: 8.8683, magnitude: 0.76, regionHint: 8 },
  { hipId: 80763, name: 'Antares', ra: 16.4901, dec: -26.432, magnitude: 0.96, regionHint: 9 },
  { hipId: 65474, name: 'Spica', ra: 13.4199, dec: -11.1613, magnitude: 0.97, regionHint: 10 },
  { hipId: 37826, name: 'Pollux', ra: 7.7553, dec: 28.0262, magnitude: 1.14, regionHint: 0 },
  { hipId: 49669, name: 'Regulus', ra: 10.1395, dec: 11.9672, magnitude: 1.35, regionHint: 1 },
  { hipId: 102098, name: 'Deneb', ra: 20.6905, dec: 45.2803, magnitude: 1.25, regionHint: 2 },
  { hipId: 113368, name: 'Fomalhaut', ra: 22.9608, dec: -29.6222, magnitude: 1.16, regionHint: 3 },
]

export const FALLBACK_STARS: StakeableStar[] = RAW_STARS.map(s =>
  toStakeableStar({ ...s, heldBy: null })
)

/** Merge live star_node rows over the fallback catalog, keyed by hipId. */
export function mergeWithFallback(live: StakeableStar[]): StakeableStar[] {
  if (live.length === 0) return FALLBACK_STARS
  const byId = new Map<number, StakeableStar>()
  for (const s of FALLBACK_STARS) byId.set(s.hipId, s)
  for (const s of live) byId.set(s.hipId, s)
  return Array.from(byId.values())
}
