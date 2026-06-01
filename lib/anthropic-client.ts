import { Anthropic } from '@anthropic-ai/sdk'
import * as dotenv from 'dotenv'
import { CLAUDE } from './models/registry'
import { isGatewayEnabled, GATEWAY_BASE_URL } from './models/gateway'

// Load environment variables
dotenv.config()

// Initialize AI Gateway status logging (dev only)
import { logAIGatewayStatus } from './utils/ai-gateway'
if (process.env.NODE_ENV === 'development') {
  logAIGatewayStatus()
}

// Single source of truth: gateway is active iff AI_GATEWAY_API_KEY is set
// (isGatewayEnabled comes from lib/models/gateway.ts)
const gatewayKey = process.env.AI_GATEWAY_API_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

// When the gateway is on, use the gateway key + Vercel base URL.
// Otherwise fall back to the direct Anthropic key.
const apiKey = isGatewayEnabled ? gatewayKey : anthropicKey

if (!apiKey) {
  console.warn(
    '[anthropic-client] No API key available. Set AI_GATEWAY_API_KEY (preferred) or ANTHROPIC_API_KEY.'
  )
}

// Create and export the Anthropic client.
// When the gateway is active the Vercel AI Gateway acts as an OpenAI-compat
// proxy, but we still keep the native Anthropic SDK client here for streaming
// calls that use the Anthropic Messages API directly.
export const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy-key',
  baseURL: isGatewayEnabled ? `${GATEWAY_BASE_URL}/anthropic` : undefined,
})

// ============================================================================
// MODEL CONFIGURATION — Updated May 2026
// ============================================================================

/**
 * @deprecated Use `CLAUDE` from `@/lib/models/registry` instead.
 * Kept for backward compatibility with existing imports.
 */
export const CLAUDE_MODELS = {
  // Claude 4.x — Current (May 2026)
  CLAUDE_OPUS_4_7: CLAUDE.OPUS,
  CLAUDE_SONNET_4_6: CLAUDE.SONNET,
  CLAUDE_HAIKU_4_5: CLAUDE.HAIKU,

  // Legacy aliases — map old names to new models for backward compat
  CLAUDE_3_5_SONNET: CLAUDE.SONNET, // Was claude-3-5-sonnet → now claude-sonnet-4-6
  CLAUDE_3_5_HAIKU: CLAUDE.HAIKU, // Was claude-3-5-haiku → now claude-haiku-4-5
  CLAUDE_3_OPUS: CLAUDE.OPUS, // Was claude-3-opus → now claude-opus-4-7
  CLAUDE_3_SONNET: CLAUDE.SONNET,
  CLAUDE_3_HAIKU: CLAUDE.HAIKU,
  CLAUDE_3_SONNET_LEGACY: CLAUDE.LEGACY_SONNET_3,
  CLAUDE_3_HAIKU_LEGACY: CLAUDE.LEGACY_HAIKU_3,
} as const

// Get model from environment or use defaults
export function getClaudeModel(type: 'default' | 'fast' | 'powerful' = 'default'): string {
  // Map tier to actual string model IDs (not LanguageModel objects).
  // Source IDs from the central registry — never hardcode model strings
  // (CLAUDE.md). The CLAUDE_DEFAULT_MODEL override mirrors resolveClaudeModel.
  const tierMap = {
    default: process.env.CLAUDE_DEFAULT_MODEL || CLAUDE.SONNET,
    fast: CLAUDE.HAIKU,
    powerful: CLAUDE.OPUS,
  }
  return tierMap[type] || tierMap.default
}

// Helper function to check if the API key is configured
export function isAnthropicConfigured(): boolean {
  return !!apiKey
}

// ============================================================================
// MESSAGE CREATION — Fixed signature + updated defaults
// ============================================================================

/**
 * Enhanced message creation with model selection.
 *
 * Supports two calling conventions:
 *   1. createClaudeMessage(messages, system?, modelType?, maxTokens?)
 *   2. createClaudeMessage(messages, modelId, temperature, maxTokens) — legacy
 */
export async function createClaudeMessage(
  messages: any[],
  systemOrModel?: string,
  modelTypeOrTemp: 'default' | 'fast' | 'powerful' | number = 'default',
  maxTokens: number = 4096
) {
  // Determine if caller is using the legacy convention (temperature as 3rd arg)
  const isLegacyCall = typeof modelTypeOrTemp === 'number'

  let model: string
  let system: string

  if (isLegacyCall) {
    // Legacy: createClaudeMessage(prompt, modelId, temperature, maxTokens)
    // In this case, systemOrModel is the model ID string
    model = systemOrModel || getClaudeModel('default')
    system = 'You are a helpful AI assistant specializing in astrological and alchemical wisdom.'
  } else {
    // Standard: createClaudeMessage(messages, system?, modelType?, maxTokens?)
    system =
      systemOrModel ||
      'You are a helpful AI assistant specializing in astrological and alchemical wisdom.'
    model = getClaudeModel(modelTypeOrTemp as 'default' | 'fast' | 'powerful')
  }

  return await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }],
  })
}

// Log stream helper function with updated model
export async function logToAnthropicStream(
  message: string,
  metadata: Record<string, any> = {}
): Promise<boolean> {
  try {
    if (!isAnthropicConfigured()) {
      console.warn('API key not configured, cannot log to stream')
      return false
    }

    console.log(`Logging to AI stream: ${message}`)

    // Create a message with Claude that acts as a logging stream
    const response = await createClaudeMessage(
      [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `LOG ENTRY: ${message}\nMETADATA: ${JSON.stringify(metadata, null, 2)}`,
            },
          ],
        },
      ],
      'You are a log processing agent. Your job is to receive logs, acknowledge them, and provide insights if needed. Be brief and efficient in your responses.',
      'fast'
    )

    // Output the model's response to the server logs
    const firstContent = response.content[0]
    if (firstContent.type === 'text') {
      console.log('AI Log Response:', (firstContent as any).text)
    }

    return true
  } catch (error) {
    console.error('Error logging to AI stream:', error)
    return false
  }
}

// Helper function to get model information
export function getModelInfo(modelType: 'default' | 'fast' | 'powerful' = 'default') {
  const model = getClaudeModel(modelType)

  const modelInfo: Record<string, any> = {
    [CLAUDE.OPUS]: {
      name: 'Claude Opus 4.7',
      contextWindow: '200K tokens',
      capabilities: ['Most capable', 'Complex reasoning', 'Agentic coding', 'Creative tasks'],
      bestFor: 'Most complex tasks, advanced analysis, multi-step reasoning',
    },
    [CLAUDE.SONNET]: {
      name: 'Claude Sonnet 4.6',
      contextWindow: '200K tokens',
      capabilities: ['Balanced performance', 'Professional use', 'Advanced analysis'],
      bestFor: 'Complex astrological calculations, chart interpretation',
    },
    [CLAUDE.HAIKU]: {
      name: 'Claude Haiku 4.5',
      contextWindow: '200K tokens',
      capabilities: ['Fast responses', 'Efficient processing', 'High-volume tasks'],
      bestFor: 'Quick queries, general responses, logging',
    },
  }

  return (
    modelInfo[model] || {
      name: 'Unknown Model',
      contextWindow: 'Unknown',
      capabilities: ['Unknown'],
      bestFor: 'General use',
    }
  )
}
