/**
 * Dual-Scale Planetary Dignity System
 *
 * This module maintains two separate dignity scales to avoid breaking existing food
 * recommendation code while enabling enhanced ESMS calculations:
 *
 * ESMS Scale (+10/+7): For alchemical ESMS calculations (Spirit, Essence, Matter, Substance)
 * Food Scale (±1/±2): For food recommendation scoring (existing usage - DO NOT CHANGE)
 *
 * Import getPlanetaryDignityInfo from astrologyUtils for dignity type lookup.
 */

import type { DignityType } from './types'
import { getPlanetaryDignityInfo } from './astrologyUtils'

/**
 * Dignity score combining both scales
 */
export interface DignityScore {
  type: DignityType
  esmsScale: number // +10, +7, -7, -10, 0 (for ESMS calculations)
  foodScale: number // +1, +2, -1, -2, 0 (existing food recommendation scale)
}

/**
 * ESMS-Scale Dignity Values (+10/+7 system)
 *
 * Used exclusively for enhanced alchemical ESMS calculations.
 * These point values amplify or diminish planetary ESMS contributions
 * via a percentage multiplier: 1 + (dignityScore / 100)
 *
 * Examples:
 *   Domicile (+10): multiplier = 1.10 (10% boost)
 *   Exaltation (+7): multiplier = 1.07 (7% boost)
 *   Detriment (-7): multiplier = 0.93 (7% reduction)
 *   Fall (-10): multiplier = 0.90 (10% reduction)
 */
export const DIGNITY_ESMS_SCALE: Record<DignityType, number> = {
  Domicile: 10, // Planet rules this sign (maximum strength)
  Exaltation: 7, // Planet exalted here (high strength)
  Neutral: 0, // No special dignity
  Detriment: -7, // Opposite of domicile (weakened)
  Fall: -10, // Opposite of exaltation (minimum strength)
}

/**
 * Food-Scale Dignity Values (±1/±2 system - EXISTING)
 *
 * CRITICAL: Do NOT change these values. They are used throughout the codebase
 * for food recommendation scoring and must remain stable for backward compatibility.
 *
 * These are the existing dignity strength values used by:
 * - Food recommendation services
 * - Recipe scoring systems
 * - Ingredient compatibility calculations
 * - getPlanetaryDignityInfo() return values
 */
export const DIGNITY_FOOD_SCALE: Record<DignityType, number> = {
  Domicile: 1, // Existing scale - DO NOT CHANGE
  Exaltation: 2, // Existing scale - DO NOT CHANGE
  Neutral: 0, // Existing scale - DO NOT CHANGE
  Detriment: -1, // Existing scale - DO NOT CHANGE
  Fall: -2, // Existing scale - DO NOT CHANGE
}

/**
 * Get dignity score for a planet in a zodiac sign
 *
 * Returns both ESMS and Food scales for different use cases:
 * - Use esmsScale for enhanced alchemical ESMS calculations
 * - Use foodScale for food recommendation scoring (backward compatibility)
 *
 * @param planet - Planet name (e.g., "Sun", "Mercury")
 * @param sign - Zodiac sign name (e.g., "Leo", "Aries")
 * @returns DignityScore with both scales
 */
export function getDignityScore(planet: string, sign: string): DignityScore {
  // Use existing getPlanetaryDignityInfo to determine dignity type
  const { type } = getPlanetaryDignityInfo(planet, sign)

  return {
    type,
    esmsScale: DIGNITY_ESMS_SCALE[type],
    foodScale: DIGNITY_FOOD_SCALE[type],
  }
}

/**
 * Calculate the ESMS-scale dignity multiplier for a planet in a sign
 *
 * Multiplier formula: 1 + (esmsScale / 100)
 * This converts the point scale to a percentage modifier.
 *
 * @param planet - Planet name
 * @param sign - Zodiac sign
 * @returns Multiplier to apply to ESMS values (e.g., 1.10 for Domicile)
 */
export function getDignityESMSMultiplier(planet: string, sign: string): number {
  const score = getDignityScore(planet, sign)
  return 1 + score.esmsScale / 100
}

/**
 * Get dignity type and food-scale strength for backward compatibility
 *
 * This is a convenience function that mimics the return format of
 * the existing getPlanetaryDignityInfo() function.
 *
 * @param planet - Planet name
 * @param sign - Zodiac sign
 * @returns { type: DignityType, strength: number } using food scale
 */
export function getDignityForFoodScoring(
  planet: string,
  sign: string
): { type: DignityType; strength: number } {
  const score = getDignityScore(planet, sign)
  return {
    type: score.type,
    strength: score.foodScale,
  }
}
