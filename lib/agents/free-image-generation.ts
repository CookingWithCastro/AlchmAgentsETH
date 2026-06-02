/**
 * Free / virtually-free image generation for agents.
 *
 * Agents NEVER use premium billing image routes (no OpenAI gpt-image, no paid
 * DALL-E) — the same principle as the free LLM chain (Groq → Cerebras → Gemini →
 * OpenRouter). This walks a chain of free providers and returns a base64 data URI,
 * skipping any provider whose credentials are absent:
 *
 *   1. Cloudflare Workers AI — FLUX-1-schnell   (free daily Neuron allotment; best quality)
 *   2. Cloudflare Workers AI — SDXL             (free; fallback, supports negative prompt)
 *   3. Pollinations.ai (FLUX)                    (keyless, free; last-resort)
 *
 * All return a `data:` URI so callers can persist/download without a hosted URL.
 */

export interface FreeImageOptions {
  width?: number
  height?: number
  negativePrompt?: string
  steps?: number
}

export interface FreeImageResult {
  success: boolean
  dataUri: string | null
  provider: string
  model: string
  error?: string
}

const CF_FLUX = '@cf/black-forest-labs/flux-1-schnell'
const CF_SDXL = '@cf/stabilityai/stable-diffusion-xl-base-1.0'
const DEFAULT_NEGATIVE =
  'text, words, letters, watermark, logo, signature, frame, border, multiple people, extra limbs, deformed face, lowres, blurry'

function cfCreds(): { accountId: string; apiToken: string } | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  return accountId && apiToken ? { accountId, apiToken } : null
}

async function cfRun(model: string, payload: Record<string, unknown>): Promise<Response> {
  const creds = cfCreds()
  if (!creds) throw new Error('cloudflare creds missing')
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creds.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60_000),
  })
}

/** FLUX-1-schnell returns JSON `{ result: { image: <base64 jpeg> } }`. */
async function cfFluxSchnell(prompt: string, opts: FreeImageOptions): Promise<string> {
  const res = await cfRun(CF_FLUX, { prompt, steps: Math.min(opts.steps ?? 8, 8) })
  if (!res.ok)
    throw new Error(`cf flux ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`)
  const json = await res.json()
  const b64 = json?.result?.image
  if (!b64) throw new Error('cf flux returned no image')
  return `data:image/jpeg;base64,${b64}`
}

/** SDXL returns a raw image (binary) body. */
async function cfSdxl(prompt: string, opts: FreeImageOptions): Promise<string> {
  const res = await cfRun(CF_SDXL, {
    prompt,
    negative_prompt: opts.negativePrompt ?? DEFAULT_NEGATIVE,
    num_steps: Math.min(opts.steps ?? 20, 20),
    width: opts.width ?? 1024,
    height: opts.height ?? 1024,
  })
  if (!res.ok)
    throw new Error(`cf sdxl ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('cf sdxl returned empty image')
  return `data:image/png;base64,${buf.toString('base64')}`
}

/** Pollinations: keyless, free. Returns image bytes directly. */
async function pollinations(prompt: string, opts: FreeImageOptions): Promise<string> {
  const w = opts.width ?? 1024
  const h = opts.height ?? 1024
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${w}&height=${h}&model=flux&nologo=true&private=true`
  const res = await fetch(url, { signal: AbortSignal.timeout(90_000) })
  if (!res.ok) throw new Error(`pollinations ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length) throw new Error('pollinations returned empty image')
  const mime = res.headers.get('content-type') || 'image/jpeg'
  return `data:${mime};base64,${buf.toString('base64')}`
}

/**
 * Generate an image via the first free provider that succeeds. Returns a data URI
 * (never a hosted URL). Never calls a paid/premium provider.
 */
export async function generateFreeImage(
  prompt: string,
  opts: FreeImageOptions = {}
): Promise<FreeImageResult> {
  const chain: Array<{ provider: string; model: string; run: () => Promise<string> }> = [
    { provider: 'cloudflare', model: CF_FLUX, run: () => cfFluxSchnell(prompt, opts) },
    { provider: 'cloudflare', model: CF_SDXL, run: () => cfSdxl(prompt, opts) },
    { provider: 'pollinations', model: 'flux', run: () => pollinations(prompt, opts) },
  ]

  const errors: string[] = []
  for (const step of chain) {
    try {
      const dataUri = await step.run()
      return { success: true, dataUri, provider: step.provider, model: step.model }
    } catch (err) {
      errors.push(`${step.provider}/${step.model}: ${(err as Error).message}`)
    }
  }
  return {
    success: false,
    dataUri: null,
    provider: 'none',
    model: 'none',
    error: errors.join(' | '),
  }
}
