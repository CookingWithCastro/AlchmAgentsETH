import type { BirthInfo } from '@/lib/schemas'

export type RenderImageMode = 'alchmize' | 'generate-image'

export interface RenderBirthInfo {
  name?: string
  year: number
  /** Render expects zero-based month: January = 0. */
  month: number
  /** Render's Astrologizer calls day-of-month `date`. */
  date: number
  hour: number
  minute: number
  latitude: number
  longitude: number
  Gender?: string
  gender?: string
}

export interface RenderPostImageInput {
  agentId: string
  agentName?: string
  title?: string
  body?: string
  prompt?: string
  birthInfo?: RenderBirthInfo | BirthInfo
  alchemyInfo?: Record<string, unknown>
  mode?: RenderImageMode
  width?: number
  height?: number
  model?: string
  provider?: 'OpenAI' | 'Livepeer'
  architecture?: 'DALL-E Algorithm' | 'Midjourney Algorithm'
}

export interface RenderPostImageResult {
  success: boolean
  mode: RenderImageMode
  imageUrl: string | null
  image_URL: string | null
  prompt: string
  promptDict: Record<string, unknown> | null
  renderData: {
    alchemyTotals?: Record<string, unknown>
    astrologyTotals?: Record<string, unknown>
    imaginizerInfo?: Record<string, unknown>
  }
  raw?: unknown
  error?: string
}

const DEFAULT_RENDER_BASE = 'https://alchm-backend.onrender.com'
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 1024
const DEFAULT_MODEL = 'gpt-image-1.5'

function getRenderBaseUrl(): string {
  return (
    process.env.ALCHM_RENDER_BACKEND_URL ||
    process.env.ALCHM_BACKEND_URL ||
    DEFAULT_RENDER_BASE
  ).replace(/\/$/, '')
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function buildRenderPostPrompt(input: RenderPostImageInput): string {
  if (input.prompt?.trim()) return input.prompt.trim()

  const agentName = asString(input.agentName) || input.agentId
  const segments = [
    `symbolic alchemical social post image for ${agentName}`,
    input.title ? `post title: ${input.title}` : undefined,
    input.body
      ? `post meaning: ${input.body.replace(/\s+/g, ' ').trim().slice(0, 360)}`
      : undefined,
    'cosmic culinary astrology',
    'rich natural texture',
    'balanced editorial composition',
    'no readable text',
  ].filter(Boolean)

  return segments.join(', ')
}

export function normalizeRenderBirthInfo(
  birthInfo: RenderPostImageInput['birthInfo'],
  fallbackName?: string
): RenderBirthInfo | null {
  if (!birthInfo || typeof birthInfo !== 'object') return null
  const source = birthInfo as Record<string, any>

  const year = Number(source.year)
  const hasRenderDate = typeof source.date !== 'undefined'
  const month =
    typeof source.month === 'number'
      ? !hasRenderDate && source.month >= 1
        ? source.month - 1
        : source.month
      : Number.NaN
  const date = Number(source.date ?? source.day)
  const hour = Number(source.hour ?? 12)
  const minute = Number(source.minute ?? 0)
  const latitude = Number(source.latitude ?? source.lat)
  const longitude = Number(source.longitude ?? source.lon)

  if (![year, month, date, hour, minute, latitude, longitude].every(Number.isFinite)) {
    return null
  }

  return {
    name: asString(source.name) || fallbackName,
    year,
    month,
    date,
    hour,
    minute,
    latitude,
    longitude,
    ...(source.Gender || source.gender ? { Gender: source.Gender || source.gender } : {}),
  }
}

function extractImageUrl(data: any): string | null {
  return (
    data?.image_URL ||
    data?.imageUrl ||
    data?.url ||
    data?.imaginizer_info?.image_URL ||
    data?.imaginizer_info?.imageUrl ||
    null
  )
}

function extractPrompt(data: any, fallback: string): string {
  return (
    data?.prompt ||
    data?.imaginizer_info?.prompt ||
    data?.imaginizer_info?.parameter_dict?.prompt ||
    fallback
  )
}

function extractPromptDict(data: any): Record<string, unknown> | null {
  return data?.prompt_dict || data?.imaginizer_info?.prompt_dict || null
}

async function fetchRenderJson(path: string, body: unknown, timeoutMs: number): Promise<any> {
  const response = await fetch(`${getRenderBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Render ${path} failed (${response.status} ${response.statusText}): ${text}`)
  }

  return response.json().catch(() => ({}))
}

export async function generateRenderPostImage(
  input: RenderPostImageInput
): Promise<RenderPostImageResult> {
  if (!input.agentId?.trim()) {
    throw new Error('agentId is required')
  }

  const prompt = buildRenderPostPrompt(input)
  const birthInfo = normalizeRenderBirthInfo(input.birthInfo, input.agentName)
  const mode: RenderImageMode = input.mode || (birthInfo ? 'alchmize' : 'generate-image')
  const width = input.width || DEFAULT_WIDTH
  const height = input.height || DEFAULT_HEIGHT
  const model = input.model || DEFAULT_MODEL
  // Default to the free provider — agents never use premium billing image routes.
  // (Avatars now use lib/agents/free-image-generation; this guards the feed/post path.)
  const provider = input.provider || 'Livepeer'

  if (mode === 'alchmize') {
    if (!birthInfo) {
      throw new Error('birthInfo is required for Render alchmize image generation')
    }

    const raw = await fetchRenderJson(
      '/alchmize-public',
      {
        birth_info: birthInfo,
        ...(input.alchemyInfo ? { alchemy_info: input.alchemyInfo } : {}),
        imaginizer_info: {
          image: 'avatar',
          prompt,
          architecture: input.architecture || 'DALL-E Algorithm',
          provider,
          model,
          width,
          height,
        },
        logging_info: {
          name: 'Planetary Agents Post Image',
          project: 'AlchmPlanetaryAgents',
          log_stream: 'agent-post-images',
          metadata: {
            agentId: input.agentId,
            agentName: input.agentName,
            source: 'planetary_agents',
          },
          tags: ['planetary-agents', 'post-image', 'render-alchmize'],
        },
      },
      120_000
    )
    const imageUrl = extractImageUrl(raw)

    return {
      success: Boolean(imageUrl),
      mode,
      imageUrl,
      image_URL: imageUrl,
      prompt: extractPrompt(raw, prompt),
      promptDict: extractPromptDict(raw),
      renderData: {
        alchemyTotals: raw?.alchemy_info?.totals,
        astrologyTotals: raw?.astrology_info?.totals,
        imaginizerInfo: raw?.imaginizer_info,
      },
      raw,
      error: imageUrl ? undefined : 'Render alchmize returned no image URL',
    }
  }

  const raw = await fetchRenderJson(
    '/generate-image',
    {
      prompt,
      provider,
      model,
      width,
      height,
    },
    90_000
  )
  const imageUrl = extractImageUrl(raw)

  return {
    success: Boolean(imageUrl),
    mode,
    imageUrl,
    image_URL: imageUrl,
    prompt: extractPrompt(raw, prompt),
    promptDict: extractPromptDict(raw),
    renderData: {},
    raw,
    error: imageUrl ? undefined : 'Render generate-image returned no image URL',
  }
}
