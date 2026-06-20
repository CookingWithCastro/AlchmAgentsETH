/**
 * Centralized AI Model Registry
 *
 * Single source of truth for all AI model identifiers used across the project.
 * Updated May 2026 to reflect the current model landscape.
 *
 * When models are deprecated or new ones released, update ONLY this file.
 */

// ============================================================================
// ANTHROPIC (CLAUDE) MODELS
// ============================================================================

export const CLAUDE = {
  // Claude 4.x — current cutting-edge family (as of May 2026)
  OPUS_4_7: 'claude-opus-4-7', // Most capable — extended thinking, reflective work
  SONNET_4_6: 'claude-sonnet-4-6', // Balanced — primary default for substantive chat
  HAIKU_4_5: 'claude-haiku-4-5-20251001', // Fast, cheap — default for historical agent chat

  // Aliases — point semantic names at the modern family
  OPUS: 'claude-opus-4-7',
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',

  // Legacy IDs kept for backward compatibility with any hardcoded callers
  LEGACY_SONNET_3_5: 'claude-3-5-sonnet-20241022',
  LEGACY_HAIKU_3_5: 'claude-3-5-haiku-20241022',
  LEGACY_OPUS_3: 'claude-3-opus-20240229',
  LEGACY_SONNET_3: 'claude-3-sonnet-20240229',
  LEGACY_HAIKU_3: 'claude-3-haiku-20240307',
} as const

export type ClaudeModelId = (typeof CLAUDE)[keyof typeof CLAUDE]

// ============================================================================
// OPENAI MODELS
// ============================================================================

export const OPENAI = {
  // GPT-4o — Current verified production models
  GPT_5_5: 'gpt-4o', // Flagship — complex reasoning, coding, agentic workflows
  GPT_5_4_MINI: 'gpt-4o-mini', // Balanced — lower latency and cost
  GPT_5_4_NANO: 'gpt-4o-mini', // Fastest — maps to gpt-4o-mini

  // Explicit aliases
  LEGACY_GPT_4O: 'gpt-4o',
  LEGACY_GPT_4O_MINI: 'gpt-4o-mini',
  LEGACY_GPT_4_TURBO: 'gpt-4-turbo-preview',
  LEGACY_GPT_3_5: 'gpt-3.5-turbo',
} as const

export type OpenAIModelId = (typeof OPENAI)[keyof typeof OPENAI]

// ============================================================================
// GOOGLE (GEMINI) MODELS
// ============================================================================

export const GEMINI = {
  // Each model has its own separate free-tier quota pool
  FLASH_25: 'gemini-2.5-flash', // Newest — separate quota from 2.0
  FLASH_20: 'gemini-2.0-flash', // Stable — 1M tokens/min free
  FLASH_LITE: 'gemini-2.0-flash-lite', // Lightest — highest throughput
} as const

export type GeminiModelId = (typeof GEMINI)[keyof typeof GEMINI]

// ============================================================================
// GROQ MODELS (Free tier fallback)
// ============================================================================

export const GROQ = {
  LLAMA_70B: 'llama-3.3-70b-versatile', // Best quality — free tier
  LLAMA_8B: 'llama-3.1-8b-instant', // Fastest — 131K ctx, free tier
  MIXTRAL: 'mixtral-8x7b-32768', // Balanced — 32K ctx, free tier
} as const

export type GroqModelId = (typeof GROQ)[keyof typeof GROQ]

// ============================================================================
// QWEN MODELS
// ============================================================================

export const QWEN = {
  CODER_32B: 'qwen/qwen-2.5-coder-32b-instruct',
  REASONING_QWQ: 'qwen/qwq-32b-preview',
  CEREBRAS_QWEN: 'qwen-3-235b',
  OPENROUTER_QWEN: 'qwen/qwen-2.5-72b-instruct:free',
} as const

export type QwenModelId = (typeof QWEN)[keyof typeof QWEN]

// ============================================================================
// EMBEDDING MODELS
// ============================================================================

export const EMBEDDINGS = {
  OPENAI_LARGE: 'text-embedding-3-large',
  OPENAI_SMALL: 'text-embedding-3-small', // Legacy default
} as const

export type EmbeddingModelId = (typeof EMBEDDINGS)[keyof typeof EMBEDDINGS]

// ============================================================================
// MODEL TIERS — Semantic accessors for the codebase
// ============================================================================

/**
 * Use these throughout the app instead of raw model IDs.
 * Each tier maps to the best available model for that purpose.
 * Free-tier strategy: spread models across different quota pools.
 */
export const MODEL_TIERS = {
  /** Deep reasoning, complex multi-step tasks, agentic coding */
  POWERFUL: {
    claude: CLAUDE.OPUS,
    openai: OPENAI.GPT_5_5,
    google: GEMINI.FLASH_25, // Newest Gemini — separate quota
    groq: GROQ.LLAMA_70B, // 70B param — strongest free model
    qwen: QWEN.REASONING_QWQ, // Deep reasoning
  },
  /** General-purpose, balanced speed/quality */
  DEFAULT: {
    claude: CLAUDE.SONNET,
    openai: OPENAI.GPT_5_4_MINI,
    google: GEMINI.FLASH_20, // Stable Gemini — separate quota from 2.5
    groq: GROQ.MIXTRAL, // Balanced free model
    qwen: QWEN.CODER_32B, // Strong instruction following & coding
  },
  /** Fast responses, high-volume, logging, simple queries */
  FAST: {
    claude: CLAUDE.HAIKU,
    openai: OPENAI.GPT_5_4_NANO,
    google: GEMINI.FLASH_LITE, // Lightest Gemini — separate quota from 2.0
    groq: GROQ.LLAMA_8B, // Ultra-fast free model
    qwen: QWEN.OPENROUTER_QWEN,
  },
} as const

/**
 * Cost-aware tiers for historical agent chat.
 *
 * The Python backend (/api/chat) resolves these tier names to concrete models.
 * `cheap_fast` is the runtime default. Free tier falls back automatically when
 * Anthropic returns quota/billing errors.
 *
 * Set `HISTORICAL_AGENT_DEFAULT_TIER` and `HISTORICAL_AGENT_MAX_TIER` env vars
 * on the backend to override defaults / cap the ceiling.
 */
export const HISTORICAL_AGENT_TIERS = {
  /** Groq Llama 3.3 — free tier, used as fallback or for autonomous bulk ops */
  FREE: { provider: 'groq', model: GROQ.LLAMA_70B },
  /** Haiku 4.5 — fast, cheap, strong persona-following. DEFAULT. */
  CHEAP_FAST: { provider: 'anthropic', model: CLAUDE.HAIKU_4_5 },
  /** Sonnet 4.6 — substantive chat, opt-in via modelTier param */
  PRIMARY: { provider: 'anthropic', model: CLAUDE.SONNET_4_6 },
  /** Opus 4.7 — rare reflective/extended-thinking turns */
  REFLECTIVE: { provider: 'anthropic', model: CLAUDE.OPUS_4_7 },
} as const

export type HistoricalAgentTier = keyof typeof HISTORICAL_AGENT_TIERS
export type HistoricalAgentTierLower = Lowercase<HistoricalAgentTier>

// ============================================================================
// FALLBACK CHAINS — Graceful degradation if a model is unavailable
// ============================================================================

export const CLAUDE_FALLBACK_CHAIN: readonly ClaudeModelId[] = [
  CLAUDE.SONNET,
  CLAUDE.HAIKU,
  CLAUDE.OPUS,
]

export const OPENAI_FALLBACK_CHAIN: readonly OpenAIModelId[] = [
  OPENAI.GPT_5_4_MINI, // gpt-4o-mini
  OPENAI.GPT_5_5, // gpt-4o
  OPENAI.LEGACY_GPT_3_5,
]

import { type LanguageModel } from 'ai'
import {
  gatewayOpenAI,
  gatewayAnthropic,
  gatewayGoogle,
  gatewayGroq,
  gatewayOpenRouter,
  isGatewayEnabled,
} from './gateway'

// Active provider is driven by DEFAULT_AI_PROVIDER env var.
// Defaults to 'google' (free tier) when unset.
const ACTIVE_PROVIDER = process.env.DEFAULT_AI_PROVIDER || 'google'

/**
 * Resolve the default LanguageModel for any tier.
 * Provider priority: google (free) → groq (free fallback) → openai → anthropic
 * Set DEFAULT_AI_PROVIDER=openai|anthropic|groq|google in env to override.
 */
export function resolveDefaultModel(
  tier: 'powerful' | 'default' | 'fast' = 'default'
): LanguageModel {
  switch (ACTIVE_PROVIDER) {
    case 'openai':
      return resolveOpenAIModel(tier)
    case 'anthropic':
      return resolveClaudeModel(tier)
    case 'groq':
      return resolveGroqModel(tier)
    case 'qwen':
      return resolveQwenModel(tier)
    default:
      return resolveGoogleModel(tier) // Free tier baseline
  }
}

/**
 * Resolve a Groq LanguageModel — free tier fallback, blazing fast inference.
 */
export function resolveGroqModel(tier: 'powerful' | 'default' | 'fast' = 'default'): LanguageModel {
  let modelId: string
  switch (tier) {
    case 'powerful':
      modelId = MODEL_TIERS.POWERFUL.groq
      break
    case 'fast':
      modelId = MODEL_TIERS.FAST.groq
      break
    default:
      modelId = MODEL_TIERS.DEFAULT.groq
      break
  }
  const finalModelId = isGatewayEnabled ? `groq/${modelId}` : modelId
  return gatewayGroq(finalModelId) as unknown as LanguageModel
}

/**
 * Resolve a Google Gemini LanguageModel — free tier, no billing required.
 */
export function resolveGoogleModel(
  tier: 'powerful' | 'default' | 'fast' = 'default'
): LanguageModel {
  const envModel = process.env.MONICA_DEFAULT_MODEL
  let modelId = envModel

  // Only use env override if it looks like a Gemini model
  if (modelId && !modelId.startsWith('gemini')) modelId = undefined

  if (!modelId) {
    switch (tier) {
      case 'powerful':
        modelId = MODEL_TIERS.POWERFUL.google
        break
      case 'fast':
        modelId = MODEL_TIERS.FAST.google
        break
      default:
        modelId = MODEL_TIERS.DEFAULT.google
        break
    }
  }

  const finalModelId = isGatewayEnabled ? `google/${modelId}` : modelId
  return gatewayGoogle(finalModelId) as unknown as LanguageModel
}

/**
 * Resolve a Claude LanguageModel — configured with Vercel AI Gateway.
 */
export function resolveClaudeModel(
  tier: 'powerful' | 'default' | 'fast' = 'default'
): LanguageModel {
  const envModel = process.env.CLAUDE_DEFAULT_MODEL
  let modelId = envModel

  if (!modelId) {
    switch (tier) {
      case 'powerful':
        modelId = MODEL_TIERS.POWERFUL.claude
        break
      case 'fast':
        modelId = MODEL_TIERS.FAST.claude
        break
      default:
        modelId = MODEL_TIERS.DEFAULT.claude
        break
    }
  }

  const finalModelId = isGatewayEnabled ? `anthropic/${modelId}` : modelId
  return gatewayAnthropic(finalModelId) as unknown as LanguageModel
}

/**
 * Resolve an OpenAI LanguageModel — configured with Vercel AI Gateway.
 */
export function resolveOpenAIModel(
  tier: 'powerful' | 'default' | 'fast' = 'default'
): LanguageModel {
  // Only use MONICA_DEFAULT_MODEL if it is an actual OpenAI model ID
  const envModel = process.env.OPENAI_DEFAULT_MODEL
  const monicaModel = process.env.MONICA_DEFAULT_MODEL
  const monicaIsOpenAI =
    monicaModel &&
    (monicaModel.startsWith('gpt-') || monicaModel.startsWith('o1') || monicaModel.startsWith('o3'))
  let modelId = envModel || (monicaIsOpenAI ? monicaModel : undefined)

  if (!modelId) {
    switch (tier) {
      case 'powerful':
        modelId = MODEL_TIERS.POWERFUL.openai
        break
      case 'fast':
        modelId = MODEL_TIERS.FAST.openai
        break
      default:
        modelId = MODEL_TIERS.DEFAULT.openai
        break
    }
  }

  const finalModelId = isGatewayEnabled ? `openai/${modelId}` : modelId
  return gatewayOpenAI(finalModelId) as unknown as LanguageModel
}

/**
 * Resolve embedding model from environment or default.
 */
export function resolveEmbeddingModel(): string {
  return process.env.EMBEDDINGS_MODEL || EMBEDDINGS.OPENAI_LARGE
}

/**
 * Resolve an OpenRouter LanguageModel.
 * Useful when OPENROUTER_API_KEY is set and you want to access any model
 * aggregated through OpenRouter (e.g. llama-4, phi-4, etc.).
 *
 * Pass a full OpenRouter model slug, e.g. "meta-llama/llama-4-scout".
 */
export function resolveOpenRouterModel(modelSlug: string): LanguageModel {
  const finalModelId = isGatewayEnabled ? `openrouter/${modelSlug}` : modelSlug
  return gatewayOpenRouter(finalModelId) as unknown as LanguageModel
}

/**
 * Resolve a Qwen LanguageModel (typically routed via OpenRouter or Groq/Cerebras).
 */
export function resolveQwenModel(tier: 'powerful' | 'default' | 'fast' = 'default'): LanguageModel {
  let modelId: string
  switch (tier) {
    case 'powerful':
      modelId = MODEL_TIERS.POWERFUL.qwen
      break
    case 'fast':
      modelId = MODEL_TIERS.FAST.qwen
      break
    default:
      modelId = MODEL_TIERS.DEFAULT.qwen
      break
  }
  return resolveOpenRouterModel(modelId)
}
