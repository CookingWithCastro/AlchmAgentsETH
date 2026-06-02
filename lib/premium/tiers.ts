/**
 * PA tier vocabulary + chat-model-tier gating (pure, no I/O — easily testable).
 *
 * There are two distinct "tier" concepts:
 *  - PaTier: the user's PLAN on Planetary Agents (free / alchemist / master).
 *  - ChatModelTier: which model the historical-agent chat uses, mirroring
 *    HISTORICAL_AGENT_TIERS in lib/models/registry.ts (free→Groq, the rest→Anthropic).
 *
 * Free users are capped to the free (Groq) chain. The premium Anthropic tiers
 * are unlocked by an active subscription OR a validated Anthropic BYOK key (the
 * user funds their own premium usage). OpenAI BYOK keys are still stored and
 * forwarded to the backend for OpenAI-served calls, but the historical-agent
 * premium tiers are Anthropic-based, so they don't unlock those by themselves.
 */

export type PaTier = 'free' | 'alchemist' | 'master'
export type ChatModelTier = 'free' | 'cheap_fast' | 'primary' | 'reflective'
export type ByokProvider = 'openai' | 'anthropic'

/** Ascending capability/cost order. */
export const CHAT_TIER_ORDER: ChatModelTier[] = ['free', 'cheap_fast', 'primary', 'reflective']

/** Which provider actually serves each chat tier (mirrors HISTORICAL_AGENT_TIERS). */
export const CHAT_TIER_PROVIDER: Record<ChatModelTier, 'groq' | 'anthropic'> = {
  free: 'groq',
  cheap_fast: 'anthropic',
  primary: 'anthropic',
  reflective: 'anthropic',
}

/** Highest chat tier each PA plan may use on app-funded models. */
export const MAX_CHAT_TIER_FOR: Record<PaTier, ChatModelTier> = {
  free: 'free',
  alchemist: 'reflective',
  master: 'reflective',
}

/** A premium chat tier is anything beyond the free Groq chain. */
export function isPremiumChatTier(tier: ChatModelTier): boolean {
  return CHAT_TIER_PROVIDER[tier] !== 'groq'
}

export function normalizeChatTier(value: unknown): ChatModelTier | null {
  if (typeof value === 'string' && (CHAT_TIER_ORDER as string[]).includes(value)) {
    return value as ChatModelTier
  }
  return null
}

/**
 * Clamp a requested chat model tier to what the user is entitled to.
 *
 * - Free tier / unknown request → 'free' (the Groq fallback chain).
 * - Premium tiers require an active subscription OR a validated Anthropic BYOK key.
 * - Not entitled → degrade gracefully to 'free' (never hard-reject).
 * - Entitled subscribers are clamped to their plan ceiling; BYOK-funded users
 *   (who pay for their own usage) may reach the top tier.
 */
export function capModelTier(
  requested: unknown,
  paTier: PaTier,
  byokProviders: ByokProvider[] = []
): ChatModelTier {
  const req = normalizeChatTier(requested) ?? 'free'
  if (!isPremiumChatTier(req)) return req

  const hasSubscription = paTier !== 'free'
  const hasAnthropicKey = byokProviders.includes('anthropic')
  if (!hasSubscription && !hasAnthropicKey) return 'free'

  const ceiling: ChatModelTier = hasSubscription ? MAX_CHAT_TIER_FOR[paTier] : 'reflective'
  const reqIdx = CHAT_TIER_ORDER.indexOf(req)
  const capIdx = CHAT_TIER_ORDER.indexOf(ceiling)
  return reqIdx <= capIdx ? req : ceiling
}
