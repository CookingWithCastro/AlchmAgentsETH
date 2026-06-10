/**
 * Agent Word Strategy — the agent analog of `planet-strategy.ts`.
 *
 * Every historical agent already carries 12 planetary Sacred dimensions
 * (`deriveSacredStats` → solarAgency, martialImpetus, jovianExpansion, …). We blend
 * the ten per-planet `rankKey` signals (planet-strategy.ts) weighted by the agent's
 * own normalized planetary dims, so a Mars-dominant agent plays short, high-firepower
 * words while a Jupiter-dominant agent reaches long — emergent from the agent's real
 * natal chart, with **no new persona table and ZERO LLM calls**. The persona ranking
 * *is* the character.
 *
 * Scale note: each planet's `rankKey` lives on a different scale (Jupiter ~ len*10,
 * Moon ~ vowelRatio*14), so we min-max normalize each planet's signal ACROSS the
 * current candidate set before weighting. Otherwise the largest-magnitude planet
 * would always dominate regardless of the agent's weights and the blend would be
 * meaningless.
 */
import type { CraftedAgent } from '@/lib/agent-types'
import { deriveSacredStats } from '@/lib/agents/persona/derive-sacred-stats'
import type { Sacred7Stats } from '@/lib/sacred-7-stats'
import { PLANETS, type Planet } from '../planetary-traits'
import { features, rankKey } from './planet-strategy'
import { type Candidate } from './word-scoring'

/** Which Sacred-7 planetary dimension weights each duel planet. */
export const PLANET_DIMENSION: Record<Planet, keyof Sacred7Stats> = {
  Sun: 'solarAgency',
  Moon: 'lunarReceptivity',
  Mercury: 'mercurialVelocity',
  Venus: 'venusianCoherence',
  Mars: 'martialImpetus',
  Jupiter: 'jovianExpansion',
  Saturn: 'saturnianStructure',
  Uranus: 'uranianSurprisal',
  Neptune: 'neptunianResonance',
  Pluto: 'plutonicIntegration',
}

export interface AgentPlayStyle {
  /** Per-planet weights, normalized to sum to 1 across the ten duel planets. */
  weights: Record<Planet, number>
  /** The agent's single most-dominant planet (highest weight). */
  dominantPlanet: Planet
}

/**
 * Turn an agent's Sacred-7 planetary dims into a normalized play-style weighting.
 * The 12 dims cluster in ~50–80, so we subtract the minimum across the ten duel
 * planets and re-normalize — the agent's RELATIVE leanings drive the blend. An
 * agent with perfectly flat stats falls back to a uniform weighting.
 */
export function deriveAgentPlayStyle(agent: CraftedAgent): AgentPlayStyle {
  const stats = deriveSacredStats(agent)
  const raw = PLANETS.map(p => Math.max(0, Number(stats[PLANET_DIMENSION[p]]) || 0))
  const min = Math.min(...raw)
  // Spread above the floor accentuates leanings; total === 0 → uniform fallback.
  const spread = raw.map(v => v - min)
  const total = spread.reduce((sum, v) => sum + v, 0)

  const weights = {} as Record<Planet, number>
  PLANETS.forEach((p, i) => {
    weights[p] = total > 0 ? spread[i] / total : 1 / PLANETS.length
  })

  let dominantPlanet: Planet = PLANETS[0]
  for (const p of PLANETS) {
    if (weights[p] > weights[dominantPlanet]) dominantPlanet = p
  }
  return { weights, dominantPlanet }
}

/**
 * Rank candidate words by how well they fit the AGENT's blended temperament.
 * Returns a NEW array (input not mutated), best-first. Deterministic: ties break
 * by full word score, then alphabetically. No LLM.
 */
export function rankCandidatesForAgent(
  agent: CraftedAgent,
  candidates: Candidate[],
  style?: AgentPlayStyle
): Candidate[] {
  if (candidates.length === 0) return []
  const { weights } = style ?? deriveAgentPlayStyle(agent)
  const feats = candidates.map(c => features(c.word))

  // Per-planet rankKey signal for every candidate, then min-max normalize each
  // planet's column to [0,1] so the scales are comparable before weighting.
  const normByPlanet = {} as Record<Planet, number[]>
  for (const p of PLANETS) {
    const col = feats.map(f => rankKey(p, f))
    const lo = Math.min(...col)
    const hi = Math.max(...col)
    const span = hi - lo
    normByPlanet[p] = span > 0 ? col.map(v => (v - lo) / span) : col.map(() => 0.5)
  }

  const scored = candidates.map((c, i) => {
    let blended = 0
    for (const p of PLANETS) blended += weights[p] * normByPlanet[p][i]
    return { candidate: c, blended, score: c.score, word: c.word }
  })
  scored.sort(
    (a, b) =>
      b.blended - a.blended || b.score - a.score || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0)
  )
  return scored.map(s => s.candidate)
}

/** The single word the agent would play from this rack (or null if none). */
export function chooseAgentWord(
  agent: CraftedAgent,
  candidates: Candidate[],
  style?: AgentPlayStyle
): Candidate | null {
  const ranked = rankCandidatesForAgent(agent, candidates, style)
  return ranked[0] ?? null
}
