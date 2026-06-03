import { NextResponse } from 'next/server'
import {
  generateRenderPostImage,
  type RenderImageMode,
  type RenderPostImageInput,
} from '@/lib/agents/render-post-image'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

function parseMode(value: unknown): RenderImageMode | undefined {
  return value === 'alchmize' || value === 'generate-image' ? value : undefined
}

export async function POST(request: Request) {
  // Server-to-server only (feed engine / cron / manual ops). Fail-closed: a
  // missing secret denies rather than opening this paid generation endpoint.
  if (!hasInternalApiSecret(request)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const agentId = typeof body.agentId === 'string' ? body.agentId.trim() : ''
  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }

  const input: RenderPostImageInput = {
    agentId,
    agentName: typeof body.agentName === 'string' ? body.agentName : undefined,
    title: typeof body.title === 'string' ? body.title : undefined,
    body: typeof body.body === 'string' ? body.body : undefined,
    prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
    birthInfo:
      body.birthInfo && typeof body.birthInfo === 'object'
        ? (body.birthInfo as RenderPostImageInput['birthInfo'])
        : undefined,
    alchemyInfo:
      body.alchemyInfo && typeof body.alchemyInfo === 'object'
        ? (body.alchemyInfo as Record<string, unknown>)
        : undefined,
    mode: parseMode(body.mode),
    width: typeof body.width === 'number' ? body.width : undefined,
    height: typeof body.height === 'number' ? body.height : undefined,
    model: typeof body.model === 'string' ? body.model : undefined,
    provider:
      body.provider === 'Livepeer' || body.provider === 'OpenAI'
        ? (body.provider as RenderPostImageInput['provider'])
        : undefined,
    architecture:
      body.architecture === 'DALL-E Algorithm' || body.architecture === 'Midjourney Algorithm'
        ? (body.architecture as RenderPostImageInput['architecture'])
        : undefined,
  }

  try {
    const result = await generateRenderPostImage(input)

    return NextResponse.json({
      success: result.success,
      mode: result.mode,
      imageUrl: result.imageUrl,
      image_URL: result.image_URL,
      prompt: result.prompt,
      promptDict: result.promptDict,
      renderData: result.renderData,
      error: result.error,
    })
  } catch (error) {
    console.error('[agents/post-image] Render generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'Agent Render Post Image',
    endpoint: 'POST /api/agents/post-image',
    provider: 'alchm-render-backend',
    modes: ['alchmize', 'generate-image'],
    authoritativeQuantities: 'WTEN/Railway remains authoritative; Render data is supplemental.',
    requiredFields: ['agentId'],
    optionalFields: [
      'agentName',
      'title',
      'body',
      'prompt',
      'birthInfo',
      'alchemyInfo',
      'mode',
      'width',
      'height',
      'model',
      'provider',
      'architecture',
    ],
  })
}
