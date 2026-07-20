/**
 * Per-planet colors + glyphs for the alchm design system.
 *
 * Intended as the convention new alchm-kit surfaces adopt. It is NOT yet the
 * repo's single source of truth: several older per-planet color/glyph maps
 * still exist and are still in use — `chartRendering.getPlanetColor`,
 * `PlanetaryChip`'s sect-element orbs, `PlanetaryClock`'s per-body hexes, the
 * admin dashboard's `sky.tsx` accents, and assorted component-local
 * `PLANET_SYMBOLS` tables (they disagree with each other, notably on
 * Venus/Mars). Migrating them is deliberately out of scope here; until that
 * happens, do not describe this module as canonical in user-facing docs.
 *
 * Colors are chosen against the dark "Modern Alchemist" palette: the two
 * luminaries take the brand accents (Sun = copper, Moon = the pale violet
 * foreground family), the classical planets take warm mineral tones, and the
 * outer planets take cool deep tones, so a ten-card grid reads as one system.
 *
 * The planet inventory itself lives in `@/calculations/planetaryFBD`
 * (TEN_PLANETS) — kept there so the data contract owns it, not the palette.
 */

export const PLANET_COLORS: Record<string, string> = {
  Sun: 'var(--accent-2)', // copper — the solar brand accent
  Moon: '#d6cfe8', // pale lavender-silver
  Mercury: 'oklch(0.85 0.07 90)', // airy pale gold (matches --el-air)
  Venus: 'oklch(0.8 0.09 25)', // warm rose
  Mars: 'oklch(0.68 0.19 30)', // ember red
  Jupiter: 'oklch(0.8 0.12 75)', // amber
  Saturn: 'oklch(0.62 0.03 290)', // lead gray-violet
  Uranus: 'oklch(0.78 0.11 200)', // electric cyan
  Neptune: 'oklch(0.68 0.12 265)', // deep indigo
  Pluto: 'oklch(0.62 0.14 340)', // dark magenta
  Ascendant: 'var(--fg-dim)',
}

export const PLANET_GLYPHS: Record<string, string> = {
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
  Ascendant: 'AC',
}

/** Color for a planet, with a neutral fallback for unknown bodies. */
export function planetColor(planet: string): string {
  return PLANET_COLORS[planet] ?? 'var(--fg-mute)'
}

/** Unicode glyph for a planet, falling back to its first letter. */
export function planetGlyph(planet: string): string {
  return PLANET_GLYPHS[planet] ?? planet.charAt(0).toUpperCase()
}
