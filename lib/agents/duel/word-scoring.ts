/**
 * Word Duel scoring + rack utilities — the Lettered Arcana half of the agent
 * duel family (sibling to the synastry-driven Jing duels).
 *
 * This module is deliberately DICTIONARY-FREE. The Word Duel "brain" is a thin
 * agent: the caller (Pentacles' SpacetimeDB module, which already owns the
 * 172k-word ENABLE list + solver in Rust) sends the legal candidate words, and
 * planetary-agents only chooses among them in character. So all we need here is
 * the shared scoring math — kept byte-for-byte compatible with Pentacles /
 * scrabblebot so `score` agrees across repos.
 *
 * Scoring parity (verified): CAT = 5, STAR = 6, SPELL = 14.
 */

/** Standard Scrabble tile values (no blanks). */
export const LETTER_VALUES: Record<string, number> = {
  A: 1,
  B: 3,
  C: 3,
  D: 2,
  E: 1,
  F: 4,
  G: 2,
  H: 4,
  I: 1,
  J: 8,
  K: 5,
  L: 1,
  M: 3,
  N: 1,
  O: 1,
  P: 3,
  Q: 10,
  R: 1,
  S: 1,
  T: 1,
  U: 1,
  V: 4,
  W: 4,
  X: 8,
  Y: 4,
  Z: 10,
}

/** A rack is either a raw string of letters or a {letter: count} map. */
export type Rack = Record<string, number> | string

/** A legal candidate move: the word plus its precomputed Scrabble score. */
export interface Candidate {
  word: string
  score: number
}

/** Length multiplier — superlinear bonus rewards longer words. */
export function lengthMultiplier(len: number): number {
  if (len <= 3) return 1.0
  if (len === 4) return 1.5
  if (len === 5) return 2.0
  if (len === 6) return 2.5
  return 3.0
}

/** Sum of raw tile values (no length multiplier). */
export function baseScore(word: string): number {
  let score = 0
  for (const char of word.toUpperCase()) {
    score += LETTER_VALUES[char] || 0
  }
  return score
}

/** Full word score: round(baseScore * lengthMultiplier). */
export function wordScore(word: string): number {
  return Math.round(baseScore(word) * lengthMultiplier(word.length))
}

/** Normalize a rack (string or map) into a 26-length A–Z count array. */
export function normalizeRack(rack: Rack): number[] {
  const counts = new Array(26).fill(0)
  if (typeof rack === 'string') {
    for (const char of rack.toUpperCase()) {
      if (char >= 'A' && char <= 'Z') counts[char.charCodeAt(0) - 65]++
    }
  } else {
    for (const [char, count] of Object.entries(rack)) {
      const upper = char.toUpperCase()
      if (upper.length === 1 && upper >= 'A' && upper <= 'Z' && Number.isFinite(count)) {
        counts[upper.charCodeAt(0) - 65] += count
      }
    }
  }
  return counts
}

/** True if `word` can be spelled from the given 26-length rack counts. */
export function canSpell(word: string, rackCounts: number[]): boolean {
  const need = new Array(26).fill(0)
  for (const char of word.toUpperCase()) {
    const code = char.charCodeAt(0)
    if (code >= 65 && code <= 90) need[code - 65]++
    else return false // non-A–Z letter cannot come from the rack
  }
  for (let i = 0; i < 26; i++) {
    if (need[i] > rackCounts[i]) return false
  }
  return true
}

/** Render a rack back to a flat uppercase string (for prompts / logging). */
export function rackToString(rack: Rack): string {
  if (typeof rack === 'string') return rack.toUpperCase().replace(/[^A-Z]/g, '')
  return Object.entries(rack)
    .map(([c, n]) => c.toUpperCase().repeat(Math.max(0, Math.floor(n))))
    .join('')
}
