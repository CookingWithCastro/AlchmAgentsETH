/**
 * Canonical 11-zone pentacle grid over the visible hemisphere (owner's spec).
 *
 * Azimuthal-equidistant projection onto a unit disk: Zenith at center (0,0), Horizon at
 * the unit circle, North = +Y, East = +X. A pentagram inscribed in the disk yields 11
 * regions:
 *   Zone 10  — Crown  (central pentagon, the zenith region)
 *   Zones 5–9 — Spires (the 5 star points, toward N / ENE / SE / SW / WNW)
 *   Zones 0–4 — Houses (the 5 arcs along the horizon between spires)
 */

export type ZoneKindName = 'Crown' | 'Spire' | 'House'

/** Outer star points (spire tips) at r=1, every 72° from North. */
export const SPIRE_TIPS: ReadonlyArray<readonly [number, number]> = [
  [0.0, 1.0], // North
  [0.9511, 0.309], // ENE
  [0.5878, -0.809], // SE
  [-0.5878, -0.809], // SW
  [-0.9511, 0.309], // WNW
]

/** Inner pentagon vertices (the Crown). */
export const CROWN_VERTICES: ReadonlyArray<readonly [number, number]> = [
  [0.2244, 0.3088],
  [0.3632, -0.118],
  [0.0, -0.382],
  [-0.3632, -0.118],
  [-0.2244, 0.3088],
]

export const SPIRE_LABELS = ['N', 'ENE', 'SE', 'SW', 'WNW'] as const

/** Render order: Crown first (drawn under), then spires, then houses. */
export const ALL_ZONE_IDS: readonly number[] = [10, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4]

export function zoneKind(zoneId: number): ZoneKindName {
  if (zoneId === 10) return 'Crown'
  if (zoneId >= 5 && zoneId <= 9) return 'Spire'
  return 'House'
}

/** Unit-disk polygon vertices for a zone id. */
export function zonePolygon(zoneId: number): Array<readonly [number, number]> {
  if (zoneId === 10) return [...CROWN_VERTICES]
  if (zoneId >= 5 && zoneId <= 9) {
    const k = zoneId - 5
    return [SPIRE_TIPS[k], CROWN_VERTICES[(k + 4) % 5], CROWN_VERTICES[k]]
  }
  if (zoneId >= 0 && zoneId <= 4) {
    const k = zoneId
    return [SPIRE_TIPS[k], CROWN_VERTICES[k], SPIRE_TIPS[(k + 1) % 5]]
  }
  return []
}

/** alt/az (deg) → unit-disk (x East, y North). Returns null below the horizon. */
export function altAzToDisk(altDeg: number, azDeg: number): [number, number] | null {
  if (altDeg < 0) return null
  const r = (90 - altDeg) / 90
  const t = azDeg * (Math.PI / 180)
  return [r * Math.sin(t), r * Math.cos(t)]
}

function pointInPoly(
  x: number,
  y: number,
  poly: ReadonlyArray<readonly [number, number]>
): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/** Zone id (0..10) for a sky coordinate, or -1 if below the horizon / outside. */
export function zoneForAltAz(altDeg: number, azDeg: number): number {
  const p = altAzToDisk(altDeg, azDeg)
  if (!p) return -1
  const [x, y] = p
  if (pointInPoly(x, y, CROWN_VERTICES)) return 10
  for (let k = 0; k < 5; k++) if (pointInPoly(x, y, zonePolygon(5 + k))) return 5 + k
  for (let k = 0; k < 5; k++) if (pointInPoly(x, y, zonePolygon(k))) return k
  return -1
}

/** Project unit-disk (x,y) to SVG screen coords for a disk centered at (cx,cy) radius R. */
export function diskToScreen(
  x: number,
  y: number,
  cx: number,
  cy: number,
  r: number
): [number, number] {
  return [cx + x * r, cy - y * r]
}

/** SVG path `d` for a zone polygon at a given screen disk. */
export function zoneScreenPath(zoneId: number, cx: number, cy: number, r: number): string {
  const pts = zonePolygon(zoneId).map(([x, y]) => diskToScreen(x, y, cx, cy, r))
  if (pts.length === 0) return ''
  return `M ${pts.map(p => p.join(' ')).join(' L ')} Z`
}
