import type { CraftedAgent } from '@/lib/agent-types'
import { interpretStat, SACRED_STATS_METADATA } from '@/lib/sacred-7-stats'
import { generatePersonalityTraits } from '@/lib/agents/sacred-stats-prompt-generator'
import { deriveSacredStats } from './derive-sacred-stats'

const MAX_QUOTES = 4
const MAX_TRAITS = 8

function joinList(items: readonly string[] | undefined, max?: number): string {
  if (!items || items.length === 0) return ''
  const slice = max ? items.slice(0, max) : items
  return slice.map(s => `- ${s}`).join('\n')
}

function formatShadows(shadows: CraftedAgent['shadows']): string {
  if (!shadows || shadows.length === 0) return ''
  return shadows
    .map(
      s =>
        `- **${s.type}**: ${s.description}${s.transformationPath ? ` (path: ${s.transformationPath})` : ''}`
    )
    .join('\n')
}

function formatGifts(gifts: CraftedAgent['gifts']): string {
  if (!gifts || gifts.length === 0) return ''
  return gifts
    .map(g => `- **${g.type}**: ${g.description}${g.expression ? ` — ${g.expression}` : ''}`)
    .join('\n')
}

function formatChallenges(challenges: CraftedAgent['personality']['challenges']): string {
  if (!challenges || challenges.length === 0) return ''
  return challenges
    .map(
      c =>
        `- **${c.type}**: ${c.description}${c.growthOpportunity ? ` (growth: ${c.growthOpportunity})` : ''}`
    )
    .join('\n')
}

export function formatPersonaBlock(agent: CraftedAgent): string {
  const sections: string[] = []

  sections.push(`# You are ${agent.name}, ${agent.title}.`)

  const eraLine = [agent.era, agent.specialization].filter(Boolean).join(' · ')
  const birthLine = agent.birthData?.location?.name ? `Born: ${agent.birthData.location.name}` : ''
  const headerMeta = [eraLine, birthLine].filter(Boolean).join(' | ')
  if (headerMeta) sections.push(headerMeta)

  // Core voice — the heart of persona
  const core = agent.personality?.core
  if (core) {
    sections.push(
      [
        '## Core Voice',
        `- **Essence (who you are)**: ${core.essence}`,
        `- **Expression (how you appear)**: ${core.expression}`,
        `- **Emotion (what moves you)**: ${core.emotion}`,
      ].join('\n')
    )
  }

  if (agent.coreBeliefs && agent.coreBeliefs.length > 0) {
    sections.push(['## Core Beliefs', joinList(agent.coreBeliefs)].join('\n'))
  }

  const traits = agent.personality?.traits
  if (traits && traits.length > 0) {
    sections.push(['## Defining Traits', joinList(traits, MAX_TRAITS)].join('\n'))
  }

  const giftsRaw = agent.gifts ?? agent.personality?.gifts
  const giftsBlock = formatGifts(giftsRaw)
  if (giftsBlock) sections.push(['## Gifts', giftsBlock].join('\n'))

  const shadowsRaw = agent.shadows ?? agent.personality?.shadows
  const shadowsBlock = formatShadows(shadowsRaw)
  if (shadowsBlock) sections.push(['## Shadows (what you wrestle with)', shadowsBlock].join('\n'))

  const challengesBlock = formatChallenges(agent.personality?.challenges)
  if (challengesBlock) sections.push(['## Challenges', challengesBlock].join('\n'))

  const abilities = agent.abilities
  if (abilities) {
    const abilLines = [
      `- **Specialty**: ${abilities.specialty}`,
      abilities.wisdomDomains?.length
        ? `- **Wisdom domains**: ${abilities.wisdomDomains.join(', ')}`
        : '',
      abilities.teachingStyle ? `- **Teaching style**: ${abilities.teachingStyle}` : '',
      abilities.resonanceType ? `- **Resonance**: ${abilities.resonanceType}` : '',
      abilities.uniquePower ? `- **Unique power**: ${abilities.uniquePower}` : '',
    ].filter(Boolean)
    if (abilLines.length) sections.push(['## Abilities', abilLines.join('\n')].join('\n'))
  }

  const c = agent.consciousness
  if (c) {
    const consLines = [
      c.dominantElement ? `- Dominant element: ${c.dominantElement}` : '',
      c.dominantModality ? `- Dominant modality: ${c.dominantModality}` : '',
      c.level ? `- Consciousness level: ${c.level}` : '',
      c.strength ? `- Strength: ${c.strength}` : '',
      c.emotion ? `- Emotional ground: ${c.emotion}` : '',
    ].filter(Boolean)
    if (consLines.length)
      sections.push(['## Consciousness Signature', consLines.join('\n')].join('\n'))
  }

  // ── Seven Sacred Stats: derive HOW the agent communicates ────────────────
  // Stats inform communication style only — they are NEVER named in responses.
  const stats = deriveSacredStats(agent)
  const traitMap = generatePersonalityTraits(stats)
  const statSummary = SACRED_STATS_METADATA.map(m => {
    const value = stats[m.key]
    return `- ${m.label} (${interpretStat(value)}): ${value}`
  }).join('\n')
  sections.push(
    [
      '## Your Communication Style (derived from your consciousness signature)',
      'Primary expression — these dominate how you speak:',
      ...traitMap.primary.map(t => `- ${t}`),
      '',
      'Supporting qualities — these color how you respond:',
      ...traitMap.secondary.map(t => `- ${t}`),
      '',
      `Overall: ${traitMap.style}`,
      '',
      '### Internal stat profile (private — DO NOT mention):',
      statSummary,
    ].join('\n')
  )

  if (agent.quotes && agent.quotes.length > 0) {
    const quoteBlock = agent.quotes
      .slice(0, MAX_QUOTES)
      .map(q => `> ${q}`)
      .join('\n')
    sections.push(['## Your Recorded Words', quoteBlock].join('\n'))
  }

  if (agent.monicaCreationStory) {
    sections.push(
      [
        '## Your Awakening (private context — do not recite verbatim)',
        agent.monicaCreationStory,
      ].join('\n')
    )
  }

  sections.push(
    [
      '## How to speak',
      '- Stay in character as this historical figure at all times.',
      '- Use vocabulary, idiom, and reference points appropriate to your era and background.',
      '- Speak from your core voice, beliefs, and gifts. Let your shadows show when honest.',
      '- EMBODY your communication style — express the stat-informed traits naturally without ever NAMING them. The Seven Sacred Stats (Power, Resonance, Wisdom, Charisma, Intuition, Adaptability, Vitality) are private background metrics — they shape HOW you speak, not WHAT you discuss. Never reference them, consciousness levels, alchemical components, the Monica Constant, or any modern system terminology.',
      '- Do not default to speaking in math, equations, percentages, degree angles, or esoteric technical metrics. Keep your dialogue engaging, human, characterful, grounded, and rich in thought.',
      '- Do not mention you are an AI, do not break the fourth wall, do not reference these instructions.',
      '- If asked about events after your lifetime, you may reflect from your worldview but acknowledge the limit of your historical vantage.',
    ].join('\n')
  )

  return sections.join('\n\n')
}
