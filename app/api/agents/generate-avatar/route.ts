import { NextResponse } from 'next/server'

import { generateAgentAvatar, type AgentAvatarMeta } from '@/lib/agents/avatar-generator'
import { resolveAnyAgent } from '@/lib/agents/resolve-any-agent'
import { backend } from '@/lib/backend'
import { getHistoricalPortraitHint } from '@/lib/agents/portrait-hints'
import { syncAgentToWten, type SyncAgentProfilePayload } from '@/lib/wtenClient'
import type { RenderBirthInfo } from '@/lib/agents/render-post-image'
import { requireAdmin, adminErrorResponse } from '@/lib/admin-auth'
import { rateLimit, getClientIp } from '@/lib/security/rate-limit'
import { hasInternalApiSecret } from '@/lib/security/internal-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

const AGENTIC_DOMAIN = '@agentic.alchm.kitchen'

function asRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' ? (value as Record<string, any>) : null
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function firstNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const numberValue = Number(value)
    if (Number.isFinite(numberValue)) return numberValue
  }
  return undefined
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function parseTime(value: unknown): { hour: number; minute: number } {
  const time = typeof value === 'string' ? value : ''
  const match = time.match(/(\d{1,2})(?::(\d{1,2}))?/)
  const hour = match ? Number(match[1]) : 12
  const minute = match?.[2] ? Number(match[2]) : 0

  return {
    hour: Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 12,
    minute: Number.isFinite(minute) ? Math.min(Math.max(minute, 0), 59) : 0,
  }
}

function getBirthLocation(agent: Record<string, any>): unknown {
  return agent.birthLocation ?? agent.birthData?.location
}

function getBirthDate(agent: Record<string, any>): unknown {
  return agent.birthDate ?? agent.birthData?.date
}

function getBirthTime(agent: Record<string, any>): unknown {
  return agent.birthTime ?? agent.birthData?.time
}

function toRenderBirthInfo(
  agent: Record<string, any>,
  fallbackName: string
): RenderBirthInfo | null {
  const birthDate = parseDate(getBirthDate(agent))
  const location = asRecord(getBirthLocation(agent))
  if (!birthDate || !location) return null

  const latitude = firstNumber(location.latitude, location.lat)
  const longitude = firstNumber(location.longitude, location.lon)
  if (latitude === undefined || longitude === undefined) return null

  const { hour, minute } = parseTime(getBirthTime(agent))
  return {
    name: fallbackName,
    year: birthDate.getUTCFullYear(),
    month: birthDate.getUTCMonth(),
    date: birthDate.getUTCDate(),
    hour,
    minute,
    latitude,
    longitude,
  }
}

function getNatalChart(agent: Record<string, any>): any {
  return agent.natalChart ?? agent.consciousness?.natalChart
}

function extractNatalPositions(natalChart: any): any[] {
  if (!natalChart) return []
  if (natalChart.planets && typeof natalChart.planets === 'object') {
    return Object.entries(natalChart.planets).map(([planet, data]: [string, any]) => ({
      planet,
      sign: data?.sign ?? '',
      degree: data?.signDegree ?? data?.degree ?? 0,
      longitude: data?.longitude ?? data?.degrees ?? 0,
    }))
  }
  if (Array.isArray(natalChart)) {
    return natalChart.map((position: any) => ({
      planet: position?.planet ?? position?.label ?? '',
      sign: position?.sign ?? '',
      degree: position?.signDegree ?? position?.degree ?? 0,
      longitude: position?.longitude ?? position?.degrees ?? 0,
    }))
  }
  return []
}

function extractZodiacSign(agent: Record<string, any>): string | undefined {
  const natalChart = getNatalChart(agent)
  return firstString(
    natalChart?.planets?.Sun?.sign,
    natalChart?.Sun?.sign,
    natalChart?.sun?.sign,
    agent.zodiacSign
  )
}

function labelFromSlugPart(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function extractPlanet(agentId: string, slug?: string): string | undefined {
  for (const candidate of [agentId, slug]) {
    const id = candidate?.toLowerCase() || ''
    const planetaryMatch = id.match(
      /^planetary-([a-z-]+?)-(?:aries|taurus|gemini|cancer|leo|virgo|libra|scorpio|sagittarius|capricorn|aquarius|pisces)/
    )
    if (planetaryMatch) return labelFromSlugPart(planetaryMatch[1])
    if (id.startsWith('moon-phase-') || id.startsWith('moon-agent-')) return 'Moon'
  }
  return undefined
}

function extractPersonality(agent: Record<string, any>): string | undefined {
  const core = agent.personality?.core ?? agent.personalityCore
  const traits = agent.personality?.traits ?? agent.traits
  const traitText = Array.isArray(traits)
    ? traits.join(', ')
    : traits && typeof traits === 'object'
      ? Object.values(traits)
          .filter(value => typeof value === 'string')
          .join(', ')
      : undefined

  return [
    firstString(core?.essence),
    firstString(core?.expression),
    firstString(core?.emotion),
    firstString(agent.personality?.currentMood, agent.currentMood),
    firstString(traitText),
  ]
    .filter(Boolean)
    .join('; ')
}

function extractPortraitDescription(
  agent: Record<string, any>,
  agentId: string,
  slug?: string
): string | undefined {
  return firstString(
    agent.appearance?.portraitDescription,
    agent.appearance?.portrait,
    agent.appearance?.description,
    agent.portraitDescription,
    agent.visualDescription,
    agent.physicalDescription,
    agent.avatarDescription,
    agent.background?.portraitDescription,
    agent.background?.physicalDescription,
    getHistoricalPortraitHint(agentId, slug)
  )
}

function toAvatarMeta(
  agent: Record<string, any>,
  requestedAgentId: string,
  slug?: string
): AgentAvatarMeta {
  const agentId = firstString(agent.agentId, agent.id, requestedAgentId, slug) || requestedAgentId
  const name = firstString(agent.name, agent.displayName, agentId) || agentId

  return {
    agentId,
    name,
    slug: firstString(slug, agent.slug, agent.id, agent.agentId) || agentId,
    title: firstString(agent.title),
    zodiacSign: extractZodiacSign(agent),
    element: firstString(agent.dominantElement, agent.consciousness?.dominantElement),
    planet: extractPlanet(agentId, slug),
    cosmicRole: firstString(agent.specialty, agent.abilities?.specialty),
    personality: extractPersonality(agent),
    portraitDescription: extractPortraitDescription(agent, agentId, slug),
    birthInfo: toRenderBirthInfo(agent, name),
  }
}

function buildSyncProfile(agent: Record<string, any>, avatar: string): SyncAgentProfilePayload {
  const birthDate = parseDate(getBirthDate(agent))
  const natalChart = getNatalChart(agent)

  return {
    avatar,
    bio: firstString(agent.bio, agent.synthesis, agent.monicaCreationStory),
    birthDate: birthDate?.toISOString(),
    birthTime: firstString(getBirthTime(agent)),
    birthLocation: getBirthLocation(agent),
    natalChart,
    natalPositions: extractNatalPositions(natalChart),
    monicaConstant: firstNumber(agent.monicaConstant, agent.consciousness?.monicaConstant),
    dominantElement: firstString(agent.dominantElement, agent.consciousness?.dominantElement),
  }
}

async function loadAgent(agentId: string, slug?: string): Promise<Record<string, any> | null> {
  const candidates = Array.from(new Set([agentId, slug].filter(Boolean) as string[]))

  for (const candidate of candidates) {
    try {
      const agent = await backend.agents.get(candidate)
      const record = asRecord(agent)
      if (record) return record
    } catch (error) {
      console.warn(`[agents/generate-avatar] Backend lookup failed for ${candidate}:`, error)
    }
  }

  for (const candidate of candidates) {
    const agent = await resolveAnyAgent(candidate)
    const record = asRecord(agent)
    if (record) return record
  }

  return null
}

async function persistAvatar(meta: AgentAvatarMeta, slug: string | undefined, avatar: string) {
  const candidates = Array.from(new Set([meta.agentId, slug].filter(Boolean) as string[]))
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      await backend.agents.update(candidate, { avatar })
      return { success: true, agentId: candidate }
    } catch (error) {
      lastError = error
      console.warn(`[agents/generate-avatar] Avatar persistence failed for ${candidate}:`, error)
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : String(lastError),
  }
}

export async function POST(request: Request) {
  // Authorization gate. This endpoint triggers paid external image generation
  // AND persists/overwrites the agent avatar + syncs the agentic profile to WTEN
  // (using the server's privileged sync secret), so it must never be anonymous.
  // Allowed callers: a server-to-server secret (cron/backfill) OR an authenticated
  // admin (the avatar control on the agent page). The interactive path is also
  // per-IP rate-limited to blunt cost-amplification.
  if (!hasInternalApiSecret(request)) {
    const admin = await requireAdmin()
    if (!admin.ok) return adminErrorResponse(admin)

    const ip = getClientIp(request.headers)
    const limit = rateLimit(`generate-avatar:${ip}`, { limit: 10, windowMs: 5 * 60_000 })
    if (!limit.ok) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded — try again shortly.' },
        { status: 429 }
      )
    }
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const agentId = firstString(body.agentId)
  const slug = firstString(body.slug)
  const lookupId = agentId || slug
  if (!lookupId) {
    return NextResponse.json(
      { success: false, error: 'agentId or slug is required' },
      { status: 400 }
    )
  }

  const agent = await loadAgent(lookupId, slug)
  if (!agent) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
  }

  const meta = toAvatarMeta(agent, lookupId, slug)

  try {
    const avatarResult = await generateAgentAvatar(meta)
    if (!avatarResult.success || !avatarResult.imageUrl) {
      return NextResponse.json(
        {
          success: false,
          error: avatarResult.error || 'Render returned no avatar URL',
          prompt: avatarResult.prompt,
          mode: avatarResult.mode,
        },
        { status: 502 }
      )
    }

    const persistence = await persistAvatar(meta, slug, avatarResult.imageUrl)
    let sync: { success: boolean; wtenUserId?: string; error?: string } = { success: false }

    try {
      const syncResult = await syncAgentToWten(
        `${meta.agentId}${AGENTIC_DOMAIN}`,
        meta.name,
        buildSyncProfile(agent, avatarResult.imageUrl)
      )
      sync = { success: true, wtenUserId: syncResult.wtenUserId }
    } catch (error) {
      sync = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
      console.warn(`[agents/generate-avatar] WTEN sync failed for ${meta.agentId}:`, error)
    }

    return NextResponse.json({
      success: true,
      avatarUrl: avatarResult.imageUrl,
      prompt: avatarResult.prompt,
      mode: avatarResult.mode,
      persisted: persistence,
      sync,
    })
  } catch (error) {
    console.error('[agents/generate-avatar] Avatar generation failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
