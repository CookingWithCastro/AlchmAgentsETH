/**
 * Rack solver — given a rack, enumerate the legal candidate words from the league
 * Codex (length 2–7, spellable from the rack), scored and capped.
 *
 * Pure + deterministic: sorted by score desc with an alphabetical tiebreak, so a
 * given rack always yields the same candidate list in the same order. The
 * dictionary is injectable (`opts.words`) so tests run on a tiny fixed wordset,
 * fully offline. Reuses `canSpell` + `wordScore` from the shared scorer.
 */
import { canSpell, normalizeRack, wordScore, type Candidate, type Rack } from './word-scoring'
import { loadWordlist } from './wordlist-loader'

export interface SolveOptions {
  /** Max candidates to return (default 150). 0 or negative = no cap. */
  cap?: number
  /** Override the dictionary (tests inject a small set). */
  words?: Iterable<string>
}

const DEFAULT_CAP = 150

/** All legal words spellable from `rack`, best-scoring first, capped. */
export function generateCandidates(rack: Rack, opts: SolveOptions = {}): Candidate[] {
  const cap = opts.cap ?? DEFAULT_CAP
  const words = opts.words ?? loadWordlist()
  const counts = normalizeRack(rack)

  const out: Candidate[] = []
  for (const raw of words) {
    const word = raw.toUpperCase()
    const len = word.length
    if (len < 2 || len > 7) continue
    if (!canSpell(word, counts)) continue
    out.push({ word, score: wordScore(word) })
  }

  out.sort((a, b) => b.score - a.score || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
  return cap > 0 && out.length > cap ? out.slice(0, cap) : out
}
