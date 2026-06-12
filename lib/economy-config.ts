export const BASE_AGENTS_YIELD = 10
export const PREMIUM_MULTIPLIER = 2.0
export const TOKEN_TYPES = ['Spirit', 'Essence', 'Matter', 'Substance'] as const
export type TokenType = (typeof TOKEN_TYPES)[number]

/**
 * Agent Action System — Activation threshold.
 * A score ≥ this value triggers an agentic user to perform an action.
 * Scale is 0–1 (normalized resonance + planetary hour alignment).
 */
export const AGENT_ACTIVATION_THRESHOLD = 0.4

/**
 * Base daily yield amount credited to each agentic user during the
 * automated daily claim cron (`/api/cron/agents/claim-yield`).
 * Distributed evenly across the four ESMS token types.
 */
export const AGENT_DAILY_YIELD = 8

/**
 * Weekly guided "attunement circle" reward — credited to the HUMAN's
 * alchm.kitchen wallet via syncCreditToAlchm (source 'group_chat_quest'),
 * once per user per week (idempotency-capped).
 *
 * Scales with engagement: each exchange in the circle is worth
 * `perAxisPerExchange` ESMS on every axis, counted up to `maxExchanges`
 * (the weekly cap), and only claimable after `minExchanges`. With the values
 * below: 4 exchanges → 8 ESMS, 12+ exchanges → 24 ESMS (cap).
 */
export const CHAT_QUEST_REWARD = {
  minExchanges: 4,
  maxExchanges: 12,
  perAxisPerExchange: 0.5,
}

export const AGENT_OPERATION_COSTS: Record<string, Partial<Record<TokenType, number>>> = {
  unified_chat: { Spirit: 5, Essence: 2 },
  report_generation: { Spirit: 10, Substance: 5 },
  // The Forge — birthing a vessel into the shared roster (45 ESMS total,
  // just under ev_reset; signed-in forging debits this, anonymous forging
  // stays free behind its per-IP rate limit).
  forge_agent: { Spirit: 15, Essence: 10, Matter: 10, Substance: 10 },
  // Cosmic Leveling — wipe an agent's Evolution Values to re-spec (50 ESMS total).
  ev_reset: { Spirit: 20, Essence: 10, Matter: 10, Substance: 10 },
  // Agentic action costs
  agent_feed_post: { Spirit: 2, Essence: 1 },
  agent_transmutation: { Matter: 3, Substance: 2 },
  agent_meal_plan: { Spirit: 4, Substance: 2 },
  agent_pantry_update: { Matter: 2, Essence: 1 },
  agent_alchemical_transmutation: { Spirit: 1, Matter: 2, Substance: 3 },
  agent_sacred_geometry_design: { Essence: 2, Substance: 3 },
  agent_energy_harmonic_calibration: { Spirit: 3, Matter: 2 },
}

// Jing Arena — completing a PAID duel round earns a small yield, capped per
// UTC day. 7 total, strictly below the cheapest billed 2-agent round (8 at
// full resonance discount), so even verified rounds are a net sink.
export const DUEL_YIELD_REWARD = { spirit: 3, essence: 2, matter: 1, substance: 1 }
export const DUEL_YIELD_DAILY_CAP = 3
