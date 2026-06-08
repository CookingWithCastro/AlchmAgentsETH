/**
 * Lazy dictionary loader for the Agent Scrabble League.
 *
 * The curated common-word Codex is embedded as a module (`data/scrabble-codex.data.ts`)
 * rather than read from disk, so it bundles cleanly in any Next.js runtime with no
 * output-file-tracing config and no risk of a missing asset. The `Set` is built once,
 * lazily, on first use and cached for the process lifetime.
 *
 * Tests inject a small fixed wordset via `__setWordlistForTests` so they stay offline,
 * fast, and decoupled from the 5k-word asset. See `data/README.md` for provenance.
 */
import { SCRABBLE_CODEX_RAW } from './data/scrabble-codex.data'

let cache: Set<string> | null = null

function build(raw: string): Set<string> {
  const set = new Set<string>()
  for (const line of raw.split('\n')) {
    const word = line.trim().toUpperCase()
    if (word.length >= 2 && word.length <= 7 && /^[A-Z]+$/.test(word)) {
      set.add(word)
    }
  }
  return set
}

/** The in-memory dictionary, built once on first call. */
export function loadWordlist(): Set<string> {
  if (!cache) cache = build(SCRABBLE_CODEX_RAW)
  return cache
}

/** True if `word` is in the league dictionary (case-insensitive). */
export function isValidWord(word: string): boolean {
  if (!word) return false
  return loadWordlist().has(word.toUpperCase())
}

/** Number of words currently loaded (diagnostics / tests). */
export function wordlistSize(): number {
  return loadWordlist().size
}

// ---------------------------------------------------------------------------
// Test hooks — keep the league tests offline and decoupled from the real asset.
// ---------------------------------------------------------------------------

/** Replace the dictionary with a fixed set (tests). */
export function __setWordlistForTests(words: Iterable<string>): void {
  cache = new Set([...words].map(w => w.toUpperCase()))
}

/** Restore the real embedded codex (tests). */
export function __resetWordlistForTests(): void {
  cache = null
}
