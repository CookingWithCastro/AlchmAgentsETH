/**
 * Jing Arena rules — the pure, isomorphic half of the Jing duel metagame.
 *
 * Pentacles' Jing metagame has FIVE moves (note: more than lib/agents/jing-system.ts's
 * four — it adds Erode, the Water·Earth compound) on a fixed counter graph that
 * mirrors the SpacetimeDB server (`JingMove::countered_by` in server/src/types.rs)
 * and the Pentacles feeder's local `COUNTER_OF` (feeder/jing-service.ts):
 *
 *     Meltdown ← Vacuum     Freeze ← Meltdown     TectonicRoot ← Erode
 *     Vacuum   ← Freeze     Erode  ← Vacuum
 *
 * This module is deliberately dependency-free so it can be imported from client
 * components AND from the server. The LLM-backed move generator lives next door in
 * ./jing-move — keep model SDKs and persona/crypto imports out of this file, or the
 * browser bundle will start pulling `node:` builtins again.
 */

export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

const PLANETS: readonly Planet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const
export function isPlanet(v: unknown): v is Planet {
  return typeof v === 'string' && PLANETS.includes(v as Planet)
}

export type JingMoveName = 'Meltdown' | 'Freeze' | 'TectonicRoot' | 'Vacuum' | 'Erode'
export const JING_MOVES: readonly JingMoveName[] = [
  'Meltdown',
  'Freeze',
  'TectonicRoot',
  'Vacuum',
  'Erode',
] as const
export function isJingMove(v: unknown): v is JingMoveName {
  return typeof v === 'string' && JING_MOVES.includes(v as JingMoveName)
}

export interface JingResult {
  move: JingMoveName
  voice: string
  element: 'fire' | 'water' | 'earth' | 'air' | 'silt'
  source: 'counter' | 'fallback'
}

/** Winning countered_by mapping from SpacetimeDB server. */
export const WINNING_COUNTER: Record<JingMoveName, JingMoveName> = {
  Meltdown: 'Vacuum', // Meltdown -> Vacuum
  Freeze: 'Meltdown', // Freeze -> Meltdown
  TectonicRoot: 'Erode', // TectonicRoot -> Erode
  Vacuum: 'Freeze', // Vacuum -> Freeze
  Erode: 'Vacuum', // Erode -> Vacuum
} as const

export const MOVE_ELEMENT: Record<JingMoveName, 'fire' | 'water' | 'earth' | 'air' | 'silt'> = {
  Meltdown: 'fire',
  Freeze: 'water',
  TectonicRoot: 'earth',
  Vacuum: 'air',
  Erode: 'silt',
}

export const VOICE: Record<Planet, (op: JingMoveName, mv: JingMoveName) => string> = {
  Sun: (op, mv) => `Behold the solar crown. Your ${op} is eclipsed by the brilliance of my ${mv}.`,
  Moon: (op, mv) =>
    `The tides shift in reflection. Your ${op} dissolves under the pull of my ${mv}.`,
  Mercury: (op, mv) =>
    `Presto! Before you can even formulate ${op}, my swift ${mv} cancels the script.`,
  Venus: (op, mv) =>
    `Harmony demands equilibrium. Let your harsh ${op} be softened and met by my ${mv}.`,
  Mars: (op, mv) => `Victory through offense! I smash your ${op} with a direct strike of ${mv}!`,
  Jupiter: (op, mv) =>
    `By the thunder of the heavens! Let your transient ${op} bow to the absolute authority of my ${mv}.`,
  Saturn: (op, mv) => `Patience undoes haste. Your ${op} erodes; my ${mv} endures.`,
  Uranus: (op, mv) =>
    `An unexpected revolution. Your traditional ${op} is scattered by the wild shock of my ${mv}.`,
  Neptune: (op, mv) =>
    `Into the deep abyss. Your structured ${op} is dissolved and lost in the dream of my ${mv}.`,
  Pluto: (op, mv) =>
    `Inevitability itself. Out of the ashes of your ${op}, my ${mv} rises to claim the end.`,
} as const
