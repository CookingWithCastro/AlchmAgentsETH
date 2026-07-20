/**
 * getPlanetaryDignityInfo, extracted from WhatToEatNext's src/utils/astrologyUtils.ts
 * (which is 1250+ lines of unrelated astrology helpers). This is the ONLY
 * function dignityScales.ts needs.
 *
 * VENDORED — see lib/alchm-fbd/README.md.
 *
 * NOTE: Mercury is listed under both rulership (virgo) and exaltation (virgo).
 * Rulership is tested first, so Domicile wins deterministically. This quirk is
 * shared verbatim with PlanetaryAgents — it is NOT drift. Do not "fix" it here
 * unilaterally; that would create real divergence where none exists.
 */

import type { DignityType } from './types'

export function getPlanetaryDignityInfo(
  planet: string,
  sign: string | null | undefined
): { type: DignityType; strength: number } {
  // Handle undefined input
  if (!planet || !sign) {
    return { type: 'Neutral', strength: 0 }
  }
  // Convert to lowercase for consistent comparison
  const planetLower = planet.toLowerCase()
  const signLower = sign.toLowerCase()
  // Planetary ruler mappings (essential dignity)
  const rulerships: Record<string, string[]> = {
    sun: ['leo'],
    moon: ['cancer'],
    mercury: ['gemini', 'virgo'],
    venus: ['taurus', 'libra'],
    mars: ['aries', 'scorpio'],
    jupiter: ['sagittarius', 'pisces'],
    saturn: ['capricorn', 'aquarius'],
    // Modern rulerships
    uranus: ['aquarius'],
    neptune: ['pisces'],
    pluto: ['scorpio'],
  }
  // Exaltation mappings
  const exaltations: Record<string, string> = {
    sun: 'aries',
    moon: 'taurus',
    mercury: 'virgo',
    venus: 'pisces',
    mars: 'capricorn',
    jupiter: 'cancer',
    saturn: 'libra',
    uranus: 'scorpio',
    neptune: 'leo',
    pluto: 'sagittarius',
  }
  // Fall mappings (opposite of exaltation)
  const falls: Record<string, string> = {
    sun: 'libra',
    moon: 'scorpio',
    mercury: 'pisces',
    venus: 'virgo',
    mars: 'cancer',
    jupiter: 'capricorn',
    saturn: 'aries',
    uranus: 'taurus',
    neptune: 'aquarius',
    pluto: 'gemini',
  }
  // Calculate detriment (opposite of rulership)
  const getDetriments = (planet: string): string[] => {
    const oppositeSignIndexes: Record<string, number> = {
      aries: 6,
      taurus: 7,
      gemini: 8,
      cancer: 9,
      leo: 10,
      virgo: 11,
      libra: 0,
      scorpio: 1,
      sagittarius: 2,
      capricorn: 3,
      aquarius: 4,
      pisces: 5,
    }
    const signs = [
      'aries',
      'taurus',
      'gemini',
      'cancer',
      'leo',
      'virgo',
      'libra',
      'scorpio',
      'sagittarius',
      'capricorn',
      'aquarius',
      'pisces',
    ]
    const rules = rulerships[planet] || []
    return rules.map(sign => signs[oppositeSignIndexes[sign]])
  }
  // Check each dignity type - Updated values to match the original algorithm
  if (rulerships[planetLower] && rulerships[planetLower].includes(signLower)) {
    return { type: 'Domicile', strength: 1.0 } // Original, value: 1
  } else if (exaltations[planetLower] === signLower) {
    return { type: 'Exaltation', strength: 2.0 } // Original, value: 2
  } else if (getDetriments(planetLower).includes(signLower)) {
    return { type: 'Detriment', strength: -1.0 } // Original value: -1
  } else if (falls[planetLower] === signLower) {
    return { type: 'Fall', strength: -2.0 } // Original value: -2
  } else {
    return { type: 'Neutral', strength: 0 }
  }
}
