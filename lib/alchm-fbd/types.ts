/**
 * Types the vendored FBD engine needs, extracted from WhatToEatNext's
 * src/types/{alchemy,celestial}.ts. Kept minimal on purpose — the source
 * files are thousands of lines of unrelated domain types.
 *
 * VENDORED — see lib/alchm-fbd/README.md. Do not edit to "fix" a local
 * type error; fix the adapter instead, or the engine drifts.
 */

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'quincunx'
  | 'inconjunct'
  | 'semi-sextile'
  | 'semisquare'
  | 'sesquisquare'
  | 'quintile'
  | 'biquintile'

export type DignityType = 'Domicile' | 'Exaltation' | 'Detriment' | 'Fall' | 'Neutral'

export interface AlchemicalProperties {
  Spirit: number
  Essence: number
  Matter: number
  Substance: number
}

export interface ElementalProperties {
  Fire: number
  Water: number
  Earth: number
  Air: number
}

export type ZodiacSignType =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'
