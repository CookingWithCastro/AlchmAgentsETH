import { generateFreeImage } from './free-image-generation'
import type { RenderBirthInfo, RenderImageMode } from './render-post-image'

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
  provider?: string
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
  const rawRole = cleanSegment(agent.title) || cleanSegment(agent.cosmicRole) || 'historical figure'
  // Avoid "the The Quantum Visionary" when the title already carries an article.
  const role = /^(the|a|an)\s/i.test(rawRole) ? rawRole : `the ${rawRole}`
  const likeness = agent.portraitDescription
    ? `Physical likeness: ${truncate(agent.portraitDescription, 320)}`
    : `Render the well-known appearance of ${agent.name} from established historical depictions`

  // Caricature = gently exaggerated, characterful, but flattering and unmistakably
  // recognizable. A single cohesive art direction across all agents keeps the
  // gallery looking like one set rather than 71 unrelated styles.
  const descriptors = [
    `Stylized character caricature portrait of ${agent.name}, ${role}`,
    likeness,
    'Gently exaggerate their most characterful features so the personality reads instantly, while keeping the face dignified, flattering, and unmistakably recognizable — a refined caricature, never grotesque or comedic',
    'Warm semi-realistic painterly digital illustration with confident brushwork, soft cinematic rim lighting, and a shallow depth of field',
    'Period-accurate clothing, hair, and signature attributes that signal exactly who this person is',
    agent.element
      ? `A subtle ${agent.element.toLowerCase()} elemental aura woven into the lighting and background`
      : 'A subtle elemental aura woven into the lighting',
    agent.planet ? `Faint ${agent.planet} planetary energy glowing in the background` : undefined,
    agent.personality
      ? `Facial expression and mood conveying: ${truncate(agent.personality, 160)}`
      : 'A characterful, alive expression with engaging eyes',
    'Head-and-shoulders, centered, facing the viewer, exactly one person',
    'Cohesive cosmic-alchemy art direction: deep jewel-tone background with a soft luminous halo behind the head',
    'Clean composition that crops well to a circular avatar, sharp focus on the face, rich detail',
    'No text, no lettering, no watermark, no logo, no frame or border, no extra people, no extra limbs, no deformities',
  ].filter(Boolean) as string[]

  // Strip trailing dots/spaces per segment so the join yields clean ". " separators.
  return descriptors.map(s => s.trim().replace(/[.\s]+$/, '')).join('. ') + '.'
}

export async function generateAgentAvatar(agent: AgentAvatarMeta): Promise<AgentAvatarResult> {
  const prompt = buildAvatarPrompt(agent)
  // FREE-ONLY image generation (Cloudflare Workers AI FLUX/SDXL → Pollinations).
  // Agents never use premium billing image routes. The caricature prompt carries
  // the full likeness + art direction; the result is a base64 data URI.
  const result = await generateFreeImage(prompt, {
    width: 1024,
    height: 1024,
    negativePrompt:
      'text, words, letters, watermark, logo, signature, frame, border, multiple people, extra limbs, deformed face, lowres, blurry',
  })

  return {
    success: result.success,
    imageUrl: result.dataUri,
    prompt,
    mode: 'generate-image',
    provider: result.provider,
    error: result.error,
  }
}
