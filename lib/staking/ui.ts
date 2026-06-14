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
