/**
 * Standard 98-tile Scrabble bag (no blanks) + a seeded, replayable draw.
 *
 * Byte-compatible with Pentacles' `server/src/words.rs` BAG (sums to 98) so letter
 * frequencies match across repos. A match is fully reproducible from its integer
 * seed: `makeSeededBag(seed)` shuffles deterministically (mulberry32) and `draw(n)`
 * pops from the shuffled order. No `Math.random` — purely a function of the seed.
 */

/** Standard English Scrabble distribution, no blanks. Sums to 98. */
export const TILE_DISTRIBUTION: Readonly<Record<string, number>> = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
}

/** Total tiles in a full bag. */
export const BAG_TOTAL = 98

/** Flat array of all 98 tiles in A–Z order (unshuffled). */
export function createTiles(): string[] {
  const tiles: string[] = []
  for (const [letter, count] of Object.entries(TILE_DISTRIBUTION)) {
    for (let i = 0; i < count; i++) tiles.push(letter)
  }
  return tiles
}

/**
 * Deterministic PRNG (mulberry32). Same seed → same sequence, everywhere. Used
 * instead of `Math.random` so every match is exactly replayable from its seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface SeededBag {
  /** Draw up to `n` tiles (fewer if the bag is nearly empty). */
  draw(n: number): string[]
  /** Tiles left in the bag. */
  remaining(): number
}

/** A seeded, deterministic bag. Same seed → same draw order, always. */
export function makeSeededBag(seed: number): SeededBag {
  const rng = mulberry32(seed)
  const tiles = createTiles()
  // Fisher–Yates shuffle with the seeded RNG.
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = tiles[i]
    tiles[i] = tiles[j]
    tiles[j] = tmp
  }
  let idx = 0
  return {
    draw(n: number): string[] {
      const out: string[] = []
      for (let k = 0; k < n && idx < tiles.length; k++) out.push(tiles[idx++])
      return out
    },
    remaining(): number {
      return tiles.length - idx
    },
  }
}
