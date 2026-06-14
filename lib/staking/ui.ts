/** Shared presentational tokens for the pentacle staking UI. */

import type { Element, EsmsId, PlanetName } from './types'

export const ELEMENT_COLOR: Record<Element, string> = {
  Fire: '#ff6b4a', // Spirit
  Water: '#4aa8ff', // Essence
  Earth: '#5fd08a', // Matter
  Air: '#c9a3ff', // Substance
}

export const ELEMENT_GLYPH: Record<Element, string> = {
  Fire: '△',
  Water: '▽',
  Earth: '⊖',
  Air: '△̶',
}

export const ESMS_LABEL: Record<EsmsId, string> = {
  0: 'Spirit',
  1: 'Essence',
  2: 'Matter',
  3: 'Substance',
}

/** ESMS glyphs by id (match the Stitch designs). */
export const ESMS_GLYPH: Record<EsmsId, string> = {
  0: '△', // Spirit / Fire
  1: '▽', // Essence / Water
  2: '⬠', // Matter / Earth
  3: '◇', // Substance / Air
}

/** ESMS color by id (Fire/Water/Earth/Air). */
export const ESMS_COLOR: Record<EsmsId, string> = {
  0: '#ff6b4a',
  1: '#4aa8ff',
  2: '#5fd08a',
  3: '#c9a3ff',
}

/** Shared cosmic theme tokens (gold accent + glass surfaces). */
export const GOLD = '#ffd76a'
export const GOLD_GLOW = '#fff3b0'

export const PLANET_GLYPH: Record<PlanetName, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
}

export const PLANET_ELEMENT: Record<PlanetName, Element> = {
  Sun: 'Fire',
  Moon: 'Water',
  Mercury: 'Air',
  Venus: 'Earth',
  Mars: 'Fire',
  Jupiter: 'Fire',
  Saturn: 'Earth',
  Uranus: 'Air',
  Neptune: 'Water',
  Pluto: 'Water',
}

export const ALL_ELEMENTS: Element[] = ['Fire', 'Water', 'Earth', 'Air']
