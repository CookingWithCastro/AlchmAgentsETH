/**
 * Validate a user-supplied provider API key with a cheap, direct call to the
 * provider (NOT through the AI Gateway — we must verify the user's own key).
 *
 * - OpenAI: GET /v1/models (auth-only, no token cost).
 * - Anthropic: a 1-token /v1/messages ping (mirrors backend/providers.py health_check).
 */

import { CLAUDE } from '@/lib/models/registry'

export type ProviderName = 'openai' | 'anthropic'
export type ValidationResult = { valid: boolean; error?: string }

const TIMEOUT_MS = 8000

export async function validateProviderKey(
  provider: ProviderName,
  apiKey: string
): Promise<ValidationResult> {
  const key = apiKey.trim()
  if (!key) return { valid: false, error: 'API key is empty' }
  try {
    return provider === 'openai' ? await validateOpenAI(key) : await validateAnthropic(key)
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Validation request failed' }
  }
}

async function validateOpenAI(key: string): Promise<ValidationResult> {
  const res = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.ok) return { valid: true }
  if (res.status === 401 || res.status === 403)
    return { valid: false, error: 'Invalid OpenAI API key' }
  return { valid: false, error: `OpenAI returned status ${res.status}` }
}

async function validateAnthropic(key: string): Promise<ValidationResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE.HAIKU,
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.ok) return { valid: true }
  if (res.status === 401 || res.status === 403) {
    return { valid: false, error: 'Invalid Anthropic API key' }
  }
  // 400 (e.g. content policy) / 429 (rate limit) still mean the key authenticated.
  if (res.status === 400 || res.status === 429) return { valid: true }
  return { valid: false, error: `Anthropic returned status ${res.status}` }
}
