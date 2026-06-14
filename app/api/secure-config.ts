// This file demonstrates how to securely handle API keys
// IMPORTANT: Never hardcode actual API keys here

// Use environment variables instead
export const config = {
  get galileoApiKey() {
    return process.env.GALILEO_API_KEY
  },
  get openaiApiKey() {
    return process.env.OPENAI_API_KEY
  },
  get anthropicApiKey() {
    return process.env.ANTHROPIC_API_KEY
  },
  get googleApiKey() {
    return process.env.GOOGLE_GENERATIVE_AI_API_KEY
  },
  get groqApiKey() {
    return process.env.GROQ_API_KEY
  },
  get aiGatewayApiKey() {
    return process.env.AI_GATEWAY_API_KEY
  },
}

// Verify keys are available (without logging them)
export function verifyApiKeys() {
  // Check for at least ONE AI provider key or Vercel AI Gateway key.
  const hasOpenAI = !!config.openaiApiKey
  const hasAnthropic = !!config.anthropicApiKey
  const hasGoogle = !!config.googleApiKey
  const hasGroq = !!config.groqApiKey
  const hasGateway = !!config.aiGatewayApiKey

  // Log key prefixes (first 10 chars) for debugging without exposing full keys
  console.log(
    '[API Keys] OpenAI present:',
    hasOpenAI,
    hasOpenAI ? `(starts with ${config.openaiApiKey?.substring(0, 10)}...)` : ''
  )
  console.log(
    '[API Keys] Anthropic present:',
    hasAnthropic,
    hasAnthropic ? `(starts with ${config.anthropicApiKey?.substring(0, 10)}...)` : ''
  )
  console.log('[API Keys] Google present:', hasGoogle)
  console.log('[API Keys] Groq present:', hasGroq)
  console.log('[API Keys] AI Gateway present:', hasGateway)
  console.log('[API Keys] Galileo present:', !!config.galileoApiKey)

  if (!hasOpenAI && !hasAnthropic && !hasGoogle && !hasGroq && !hasGateway) {
    console.error(
      '[API Keys] CRITICAL: Missing AI API keys! Need OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, GROQ_API_KEY, or AI_GATEWAY_API_KEY'
    )
    console.error(
      '[API Keys] Environment variables loaded:',
      Object.keys(process.env).filter(k => k.includes('API') || k.includes('KEY'))
    )
    return false
  }

  // Galileo is optional
  if (!config.galileoApiKey) {
    console.warn('[API Keys] GALILEO_API_KEY not set (optional for observability)')
  }

  console.log(
    `[API Keys] Verification passed - OpenAI: ${hasOpenAI}, Anthropic: ${hasAnthropic}, Google: ${hasGoogle}, Groq: ${hasGroq}, Gateway: ${hasGateway}`
  )
  return true
}
