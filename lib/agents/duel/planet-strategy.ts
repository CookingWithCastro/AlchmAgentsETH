/**
 * Per-planet Word Duel strategy — turns a planet's temperament into (a) a
 * ranking over the legal candidate words and (b) a voice/directive for the
 * model prompt.
 *
 * Persona is canonical: temperament comes from the shared PLANETARY_TRAITS
 * table (the same data the unified agent factory uses), and the word-selection
 * axis is named by each planet's dominant Sacred dimension. This is the fix for
 * the original spec's flaw: a single "top-25 by score" candidate list is
 * dominated by long words, so Mars ("short, punchy, raw value over length")
 * could never surface a short strike. Here, EACH planet re-ranks the candidates
 * by its own preference before the model chooses, so character actually drives
 * the move.
 */

import { PLANETARY_TRAITS, type Planet } from '../planetary-traits'
import { baseScore, wordScore, type Candidate } from './word-scoring'

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U'])
// Soft / liquid consonants that give a word a flowing, watery feel.
const LIQUIDS = new Set(['L', 'M', 'N', 'R', 'S', 'W', 'Y'])
// Hard stops that make a word feel sharp / clipped.
const HARD_STOPS = new Set(['B', 'C', 'D', 'G', 'K', 'P', 'Q', 'T', 'X'])
// Rare, high-value letters — the eccentric/surprising palette.
const RARE = new Set(['J', 'K', 'Q', 'V', 'W', 'X', 'Y', 'Z'])

export interface WordFeatures {
  word: string
  len: number
  score: number // full word score (with length multiplier)
  raw: number // base tile value (no multiplier)
  vowelRatio: number
  liquidCount: number
  hardStopCount: number
  rareCount: number
}

export function features(word: string): WordFeatures {
  const upper = word.toUpperCase()
  let vowels = 0
  let liquids = 0
  let hardStops = 0
  let rare = 0
  for (const ch of upper) {
    if (VOWELS.has(ch)) vowels++
    if (LIQUIDS.has(ch)) liquids++
    if (HARD_STOPS.has(ch)) hardStops++
    if (RARE.has(ch)) rare++
  }
  const len = upper.length || 1
  return {
    word: upper,
    len: upper.length,
    score: wordScore(upper),
    raw: baseScore(upper),
    vowelRatio: vowels / len,
    liquidCount: liquids,
    hardStopCount: hardStops,
    rareCount: rare,
  }
}

/**
 * rankKey(planet, features) → higher is "more in-character" for that planet.
 * Ties are broken by full word score (see compareForPlanet).
 *
 * Exported so the agent-word-strategy (the league's per-agent analog) can blend
 * the ten per-planet signals weighted by an agent's Sacred-7 planetary dims.
 */
export function rankKey(planet: Planet, f: WordFeatures): number {
  switch (planet) {
    // Sovereign, radiant — confident, high-value, dominant.
    case 'Sun':
      return f.score + (f.len >= 5 ? 4 : 0)
    // Intuitive, tidal — soft, flowing, vowel/liquid-rich.
    case 'Moon':
      return f.vowelRatio * 14 + f.liquidCount * 2 - f.hardStopCount * 1.5
    // Cunning — the sharpest duelist; pure score maximization.
    case 'Mercury':
      return f.score
    // Harmonious — elegant, balanced (≈45% vowels), pleasant mid-length.
    case 'Venus':
      return 10 - Math.abs(f.vowelRatio - 0.45) * 18 - Math.abs(f.len - 5) * 0.8
    // Aggressive — raw firepower per tile; short, punchy strikes.
    case 'Mars':
      return f.raw / f.len - (f.len > 4 ? (f.len - 4) * 0.6 : 0)
    // Expansive — grand; the longest word it can form.
    case 'Jupiter':
      return f.len * 10 + f.score * 0.1
    // Disciplined — solid, structured, mid-length; never reckless extremes.
    case 'Saturn':
      return f.score - (f.len < 3 || f.len > 7 ? 8 : 0) - f.rareCount * 2
    // Chaotic — surprising, unusual, rare-letter eccentricity.
    case 'Uranus':
      return f.rareCount * 10 + f.score * 0.4
    // Illusory — dreamy, ambiguous, flowing and long.
    case 'Neptune':
      return f.vowelRatio * 10 + f.liquidCount * 1.5 + f.len * 0.6
    // Transformative — intense, dark, powerful; high value with heavy letters.
    case 'Pluto':
      return f.score + f.rareCount * 2 + f.hardStopCount * 1.2
    default:
      return f.score
  }
}

function compareForPlanet(planet: Planet, a: WordFeatures, b: WordFeatures): number {
  const ka = rankKey(planet, a)
  const kb = rankKey(planet, b)
  if (kb !== ka) return kb - ka
  // Tie-break by full score, then by the planet's length leaning, then alpha.
  if (b.score !== a.score) return b.score - a.score
  if (planet === 'Mars' && a.len !== b.len) return a.len - b.len // shorter wins
  if (planet === 'Jupiter' && a.len !== b.len) return b.len - a.len // longer wins
  return a.word < b.word ? -1 : a.word > b.word ? 1 : 0
}

/**
 * Re-rank candidate words by how well they fit the planet's temperament.
 * Returns a NEW array (input is not mutated), best-first.
 */
export function rankCandidates(planet: Planet, candidates: Candidate[]): Candidate[] {
  const withFeatures = candidates.map(c => ({ candidate: c, f: features(c.word) }))
  withFeatures.sort((x, y) => compareForPlanet(planet, x.f, y.f))
  return withFeatures.map(x => x.candidate)
}

export interface PlanetStrategy {
  planet: Planet
  /** Free-tier model leaning — the "sharpest" duelists get the stronger model. */
  sharp: boolean
  dominantDimension: string
  /** One-line strategic directive injected into the system prompt. */
  directive: string
  /** Persona voice descriptor injected into the system prompt. */
  voice: string
}

const DIRECTIVES: Record<Planet, string> = {
  Sun: 'Project majesty and authority — play a confident, high-value word that radiates dominance.',
  Moon: 'Choose a gentle, flowing, watery word; let intuition and rhythm guide you, not force.',
  Mercury:
    'Be the sharpest mind at the table — take the cleverest, highest-scoring word available.',
  Venus: 'Choose an elegant, balanced, pleasing word; favor grace over raw power.',
  Mars: 'Strike fast and hit hard — a short, punchy word packed with high-value letters.',
  Jupiter: 'Think big — reach for the longest, grandest word you can form.',
  Saturn: 'Be disciplined and solid — a structured, dependable word; never reckless.',
  Uranus: 'Surprise the table — choose the most unusual, rare, off-beat word.',
  Neptune: 'Drift into the dream — a soft, ambiguous, mystical, flowing word.',
  Pluto: 'Transform the board — an intense, dark, powerful word with hidden weight.',
}

// The three "sharpest" tacticians get the stronger free model (Groq Llama-70B);
// the rest run on the ultra-fast free model. (Honors "Mercury is the sharpest
// duelist" within the free chain — no Anthropic credits spent.)
const SHARP_PLANETS = new Set<Planet>(['Mercury', 'Jupiter', 'Saturn'])

/** Build the prompt-facing strategy + voice for a planet. */
export function planetStrategy(planet: Planet): PlanetStrategy {
  const t = PLANETARY_TRAITS[planet]
  return {
    planet,
    sharp: SHARP_PLANETS.has(planet),
    dominantDimension: t.dominantDimension,
    directive: DIRECTIVES[planet],
    voice: `${t.specialty} — your manner is ${t.teachingStyle.toLowerCase().replace(/-/g, ', ')}; your resonance is ${t.resonance.toLowerCase()} and your presence is ${t.aura}.`,
  }
}
