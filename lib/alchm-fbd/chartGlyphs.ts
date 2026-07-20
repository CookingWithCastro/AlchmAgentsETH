/**
 * Zodiac glyph lookup, extracted from WhatToEatNext's src/utils/chartRendering.ts.
 * The FBD card needs only this one function from that module.
 *
 * VENDORED — see README.md.
 */

import type { ZodiacSignType } from './types'

export function getZodiacGlyph(sign: ZodiacSignType): string {
  const glyphs: Record<ZodiacSignType, string> = {
    aries: '♈',
    taurus: '♉',
    gemini: '♊',
    cancer: '♋',
    leo: '♌',
    virgo: '♍',
    libra: '♎',
    scorpio: '♏',
    sagittarius: '♐',
    capricorn: '♑',
    aquarius: '♒',
    pisces: '♓',
  }

  return glyphs[sign] || sign.charAt(0).toUpperCase()
}
