import {
  generateRenderPostImage,
  type RenderBirthInfo,
  type RenderImageMode,
} from './render-post-image'

export interface AgentAvatarMeta {
  agentId: string
  name: string
  slug: string
  title?: string
  zodiacSign?: string
  element?: string
  planet?: string
  cosmicRole?: string
  personality?: string
  portraitDescription?: string
  birthInfo?: RenderBirthInfo | null
}

export interface AgentAvatarResult {
  success: boolean
  imageUrl: string | null
  prompt: string
  mode: RenderImageMode
  error?: string
}

function cleanSegment(value: string | undefined | null): string | undefined {
  if (!value) return undefined
  return value.replace(/\s+/g, ' ').trim() || undefined
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value
}

export function buildAvatarPrompt(agent: AgentAvatarMeta): string {
  const descriptors = [
    `recognizable historically informed portrait likeness of ${agent.name}`,
    agent.portraitDescription
      ? `physical reference: ${truncate(agent.portraitDescription, 360)}`
      : `base the facial likeness on well-known historical depictions of ${agent.name} when available`,
    'human face first; preserve age, facial structure, hair, expression, and culturally appropriate clothing cues',
    cleanSegment(agent.title),
    cleanSegment(agent.cosmicRole),
    agent.zodiacSign ? `${agent.zodiacSign} zodiac signature` : undefined,
    agent.element ? `${agent.element} elemental energy` : undefined,
    agent.planet ? `ruled by ${agent.planet}` : undefined,
    agent.personality ? `personality: ${truncate(agent.personality, 220)}` : undefined,
    'subtle alchemical and astrological aura around the person, not replacing their human likeness',
    'alchemical digital art',
    'luminous celestial atmosphere',
    'expressive eyes',
    'centered shoulders-up profile picture composition',
    'clean circular-avatar friendly crop',
    'rich detail',
    'no readable text',
    'no logo',
    'no watermark',
  ].filter(Boolean)

  return descriptors.join(', ')
}

export async function generateAgentAvatar(agent: AgentAvatarMeta): Promise<AgentAvatarResult> {
  const prompt = buildAvatarPrompt(agent)
  const mode: RenderImageMode = agent.birthInfo ? 'alchmize' : 'generate-image'
  const result = await generateRenderPostImage({
    agentId: agent.agentId,
    agentName: agent.name,
    prompt,
    birthInfo: agent.birthInfo || undefined,
    mode,
    width: 1024,
    height: 1024,
  })

  return {
    success: result.success,
    imageUrl: result.imageUrl,
    prompt: result.prompt || prompt,
    mode: result.mode,
    error: result.error,
  }
}
