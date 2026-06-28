import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Monitor } from 'lucide-react'
import { HISTORICAL_AGENTS } from '@/lib/agents/historical'
import { resolveAnyAgent } from '@/lib/agents/resolve-any-agent'
import { classifyAgent } from '@/lib/agents/agent-type-model'
import { getSpriteView } from '@/lib/agents/sprite-view'
import { SkySpriteProfile } from '@/components/agent-profile/SkySpriteProfile'
import { AgentAvatarControl } from '@/components/agent-profile/AgentAvatarControl'
import {
  getAgentActions,
  getAgentInteractions,
  getAgentArtifacts,
  getAgentBalances,
} from '@/lib/agents/activity-surfaces'
import { AgentActivity } from '@/components/agent-profile/AgentActivity'
import type { CraftedAgent, Element } from '@/lib/agent-types'

// Pre-render the 71 canonical agents at build time; resolve everything else
// (the ~3,637 planetary/moon + DB-only crafted agents) on demand. Without
// dynamicParams this route 404'd for ~98% of agents.
export const dynamicParams = true
export const revalidate = 3600

export async function generateStaticParams() {
  return HISTORICAL_AGENTS.map(a => ({ id: a.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const agent = await resolveAnyAgent(id)
  if (!agent) return { title: 'Agent profile not found' }
  return {
    title: `${agent.name} — ${agent.title}`,
    description:
      agent.personality?.core?.essence ||
      agent.synthesis ||
      `${agent.name}: ${agent.specialization ?? agent.era ?? 'Historical agent'}`,
  }
}

const ELEMENT_TINT: Record<Element, string> = {
  Fire: 'from-orange-500/30 to-red-500/10',
  Water: 'from-blue-500/30 to-cyan-500/10',
  Air: 'from-sky-400/30 to-indigo-500/10',
  Earth: 'from-emerald-500/30 to-lime-500/10',
}

import { StitchProfileClient } from '@/components/agent-profile/stitch-profile-client'
import { getTarotRecommendations } from '@/lib/thermodynamics-to-tarot'
import { ELEMENT_METADATA } from '@/lib/element-metadata'

const SUIT_METADATA: Record<string, { icon: string; color: string; border: string; text: string }> =
  {
    wands: {
      icon: 'bolt',
      color: 'text-spirit-fire',
      border: 'border-spirit-fire/30',
      text: 'text-spirit-fire',
    },
    cups: {
      icon: 'water_drop',
      color: 'text-essence-water',
      border: 'border-essence-water/30',
      text: 'text-essence-water',
    },
    swords: {
      icon: 'swords',
      color: 'text-substance-air',
      border: 'border-substance-air/30',
      text: 'text-substance-air',
    },
    pentacles: {
      icon: 'stars',
      border: 'border-matter-earth/30',
      color: 'text-matter-earth',
      text: 'text-matter-earth',
    },
    major_arcana: {
      icon: 'auto_awesome',
      color: 'text-bright-gold',
      border: 'border-primary-gold/30',
      text: 'text-primary-gold',
    },
  }

function getCardNumberLabel(card: any): string {
  if (card.majorArcana) {
    return 'XXII'
  }
  if (card.court) return card.court.toUpperCase()
  if (card.number === 1) return 'ACE'
  const numberNames = ['', 'ACE', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return numberNames[card.number] || String(card.number)
}

function getZodiacSign(degrees: number): string {
  const signs = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ]
  const index = Math.floor((degrees % 360) / 30)
  return signs[index] || 'Aries'
}

export default async function AgentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Sky sprites (planetary degree / moon) render a lightweight celestial view —
  // not the full historical profile (no economy/leveling sections). This also
  // resolves /agent/<degree> instead of 404ing through resolveAnyAgent.
  if (classifyAgent(id).isSprite) {
    const spriteView = await getSpriteView(id)
    if (spriteView) return <SkySpriteProfile view={spriteView} />
  }

  const agent = await resolveAnyAgent(id)
  if (!agent) notFound()

  const accent = agent.appearance?.color || '#7c3aed'
  const tint =
    ELEMENT_TINT[agent.consciousness?.dominantElement as Element] ||
    'from-violet-500/30 to-fuchsia-500/10'

  const planets = agent.consciousness?.natalChart?.planets ?? {}
  const aspects = agent.consciousness?.natalChart?.aspects ?? []

  // Activity surfaces, fetched server-side. The /api/agents/[slug]/* routes are
  // bearer-gated (INTERNAL_API_SECRET), so we call the underlying functions
  // directly and keep the secret off the client. Each degrades to empty.
  const noParams = new URLSearchParams()
  const [actionsRes, interactionsRes, artifactsRes, balances] = await Promise.all([
    getAgentActions(agent.id, noParams).catch(() => ({ actions: [] as any[] })),
    getAgentInteractions(agent.id, noParams).catch(() => ({ interactions: [] as any[] })),
    getAgentArtifacts(agent.id, noParams).catch(() => ({ artifacts: [] as any[] })),
    getAgentBalances(agent.id).catch(() => null),
  ])
  const alch = agent.consciousness?.alchemicalElements || {
    spirit: 0.5,
    essence: 0.5,
    matter: 0.5,
    substance: 0.5,
  }
  const tarotResult = getTarotRecommendations({
    heat: (alch.essence || 0.5) * 100,
    entropy: (alch.matter || 0.5) * 100,
    reactivity: (alch.substance || 0.5) * 100,
    energy: (alch.spirit || 0.5) * 100,
  })
  const recommendedCards = tarotResult.cardRecommendations || []

  // Resolve Rising Sign
  const ascDegree =
    agent.consciousness?.natalChart?.ascendant || agent.consciousness?.natalChart?.houses?.ASC || 0
  const risingSign = getZodiacSign(ascDegree)

  const element = agent.consciousness?.dominantElement || 'Air'
  const meta = ELEMENT_METADATA[element as keyof typeof ELEMENT_METADATA] || ELEMENT_METADATA.Air

  return (
    <div className="relative min-h-screen bg-[#10131f] text-[#e0e1f3] font-body-md overflow-x-hidden">
      {/* Client Component for Starfield, Live Clock, and Scrolling Telemetry Logs */}
      <StitchProfileClient
        monicaConstant={agent.consciousness?.monicaConstant || 5.0}
        dominantElement={element}
        actions={(actionsRes as any).actions || []}
        interactions={(interactionsRes as any).interactions || []}
      />

      <div className="container relative z-10 py-xxl max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-gutter">
        {/* Back navigation */}
        <div className="flex justify-between items-center pb-md border-b border-border-gold/15 mb-lg">
          <Link
            href="/gallery"
            className="font-mono-label text-mono-label text-muted-text hover:text-primary-gold flex items-center gap-xs transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Return to Repository</span>
          </Link>
          <span className="font-mono-data text-xs text-muted-text select-none">
            RECORD: #{agent.id.toUpperCase().slice(0, 12)}
          </span>
        </div>

        {/* Hero Section */}
        <section className="glass-panel p-lg flex flex-col md:flex-row items-center md:items-start gap-lg relative overflow-hidden bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)]">
          {/* Portrait with Element glow */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-40 h-40 rounded-full overflow-hidden border-2 flex items-center justify-center ${meta.glow}`}
              style={{
                boxShadow: `0 0 20px -2px ${meta.glowColor}`,
              }}
            >
              <img
                src={agent.appearance?.avatar || '/avatars/default.png'}
                alt={agent.name}
                className="w-full h-full object-cover filter grayscale hover:grayscale-0 transition-all duration-700"
              />
            </div>
            <div
              className={`absolute -bottom-2 right-4 ${meta.bg} text-background text-[10px] px-2.5 py-0.5 rounded-full font-mono-label font-bold uppercase tracking-wider`}
            >
              {element}
            </div>
          </div>

          {/* Details */}
          <div className="flex-grow text-center md:text-left min-w-0 z-10">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-sm mb-xs">
              <Badge
                variant="outline"
                className="border-border-gold text-bright-gold font-mono-label text-[10px] uppercase bg-black/40"
              >
                {agent.era || agent.historicalEra || 'Modern'}
              </Badge>
              <Badge
                variant="outline"
                className="border-border-gold text-bright-gold font-mono-label text-[10px] uppercase bg-black/40"
              >
                {agent.consciousness?.dominantModality || 'Fixed'}
              </Badge>
              <Badge
                variant="outline"
                className="border-border-gold text-bright-gold font-mono-label text-[10px] uppercase bg-black/40"
              >
                {agent.specialization || 'Alchemical Scholar'}
              </Badge>
            </div>
            <h1 className="font-hero-title text-hero-title text-primary-gold leading-tight mb-2 py-1">
              {agent.name}
            </h1>
            <p className="font-mono-label text-mono-label text-muted-text uppercase tracking-widest mb-md">
              {agent.title || 'Agent Codex'}
            </p>

            {agent.quotes && agent.quotes.length > 0 && (
              <blockquote className="border-l-2 border-primary-gold/40 pl-4 py-1 italic text-muted-text text-sm leading-relaxed max-w-2xl mx-auto md:mx-0">
                &ldquo;{agent.quotes[0]}&rdquo;
              </blockquote>
            )}
          </div>

          {/* Interactive Channel trigger */}
          <div className="flex flex-col gap-2 w-full md:w-auto relative z-20">
            <Button
              asChild
              size="lg"
              className="bg-primary-gold hover:bg-primary-gold/80 text-background font-mono-label text-xs uppercase tracking-wider h-[44px]"
            >
              <Link href={`/gallery/chat/${agent.id}`}>Channel this Agent ⚡</Link>
            </Button>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 border-border-gold text-bright-gold hover:border-primary-gold font-mono-label text-[10px] uppercase bg-[#12141f]/40 h-[36px]"
              >
                <a
                  href={`alchm://install?agent=${encodeURIComponent(agent.id)}&url=${encodeURIComponent(`https://cdn.alchm.kitchen/models/alchm-agent-${element.toLowerCase()}-8b.gguf`)}`}
                >
                  <Monitor className="w-3.5 h-3.5 mr-1" />
                  Desktop App
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1 border-border-gold text-bright-gold hover:border-primary-gold font-mono-label text-[10px] uppercase bg-[#12141f]/40 h-[36px]"
              >
                <a
                  href={`https://cdn.alchm.kitchen/models/alchm-agent-${element.toLowerCase()}-8b.gguf`}
                  download
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  .gguf Model
                </a>
              </Button>
            </div>
          </div>

          {/* Background Watermark Sign Glyph */}
          <span className="material-symbols-outlined absolute -bottom-12 -right-12 text-[180px] text-border-gold/5 pointer-events-none select-none font-light">
            {element === 'Air'
              ? 'air'
              : element === 'Water'
                ? 'water_drop'
                : element === 'Fire'
                  ? 'local_fire_department'
                  : 'stars'}
          </span>
        </section>

        {/* 3-Column Codex Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter relative z-10">
          {/* Column 1: Consciousness Profile */}
          <div className="glass-panel p-md flex flex-col justify-between bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] min-h-[480px]">
            <div>
              <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
                Consciousness Profile
              </span>

              {/* Radial Chart inside stitch-profile-client will draw itself */}
              <div id="monica-constant-container" className="my-md flex justify-center">
                {/* Visual placeholder for server SSR layout stability */}
                <div className="w-48 h-48 rounded-full border border-dashed border-border-gold/10 flex items-center justify-center">
                  <div className="text-center">
                    <span className="font-mono-data text-4xl text-bright-gold font-bold">
                      {(agent.consciousness?.monicaConstant || 5.0).toFixed(2)}
                    </span>
                    <span className="text-[9px] font-mono-label text-muted-text uppercase tracking-wider block mt-1">
                      MONICA CONSTANT
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Table */}
              <div className="space-y-sm border-t border-border-gold/10 pt-md">
                <div className="flex justify-between items-center py-xs border-b border-border-gold/5 font-mono-data text-[12px]">
                  <span className="text-muted-text uppercase font-mono-label text-[10px]">
                    Level
                  </span>
                  <span className="text-ivory-text font-semibold">
                    {agent.consciousness?.level || 'Transcendent'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-xs border-b border-border-gold/5 font-mono-data text-[12px]">
                  <span className="text-muted-text uppercase font-mono-label text-[10px]">
                    Alchemical Wisdom
                  </span>
                  <span className="text-ivory-text">
                    {Math.round(agent.sacredStats?.wisdom || 80)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-xs border-b border-border-gold/5 font-mono-data text-[12px]">
                  <span className="text-muted-text uppercase font-mono-label text-[10px]">
                    Intuition Velocity
                  </span>
                  <span className="text-ivory-text">
                    {Math.round(agent.sacredStats?.intuition || 85)}%
                  </span>
                </div>
                <div className="flex justify-between items-center py-xs font-mono-data text-[12px]">
                  <span className="text-muted-text uppercase font-mono-label text-[10px]">
                    Primary Specialty
                  </span>
                  <span className="text-bright-gold truncate max-w-[140px] text-right">
                    {agent.specialization || agent.abilities?.specialty || 'Quantum physics'}
                  </span>
                </div>
              </div>
            </div>

            {/* Telemetry Logs Panel Container */}
            <div id="telemetry-logs-target" className="mt-lg border-t border-border-gold/20 pt-md">
              {/* Loaded dynamically by Client Component */}
            </div>
          </div>

          {/* Column 2: Natal Placements */}
          <div className="glass-panel p-md flex flex-col items-center bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] min-h-[480px]">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase self-start">
              Natal Chart Placements
            </span>

            {/* Stylized Zodiac circle */}
            <div className="relative w-64 h-64 rounded-full border border-border-gold/20 flex items-center justify-center bg-[#0b0e19]/30 my-lg relative">
              <div className="absolute inset-4 rounded-full border border-border-gold/5"></div>
              <div className="absolute inset-10 rounded-full border border-dashed border-border-gold/10"></div>

              <div className="absolute text-center flex flex-col items-center z-10 px-md">
                <span className="material-symbols-outlined text-4xl text-bright-gold leading-none float-anim">
                  {planets.Sun?.sign === 'Leo' ? 'wb_sunny' : 'stars'}
                </span>
                <span className="font-headline-md text-bright-gold mt-2 text-base leading-tight">
                  Sun in {planets.Sun?.sign || 'Aries'}
                </span>
                <span className="font-mono-label text-[9px] text-muted-text uppercase tracking-widest mt-1">
                  Rising sign: {risingSign}
                </span>
              </div>

              {/* Placement nodes plotted around circle */}
              {Object.entries(planets)
                .slice(0, 8)
                .map(([planet, p]: [string, any], idx) => {
                  const angle = (idx * (360 / 8) * Math.PI) / 180
                  const x = 50 + 40 * Math.cos(angle)
                  const y = 50 + 40 * Math.sin(angle)
                  return (
                    <div
                      key={planet}
                      className="absolute w-2 h-2 rounded-full bg-border-gold hover:bg-primary-gold cursor-help transition-all shadow-[0_0_5px_rgba(216,180,106,0.4)]"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      title={`${planet}: ${p.sign} ${p.degree.toFixed(1)}°`}
                    />
                  )
                })}
            </div>

            {/* List of Placements */}
            <div className="w-full space-y-xs overflow-y-auto max-h-[160px] custom-scrollbar pr-1 border-t border-border-gold/10 pt-md font-mono-data text-[11px] text-ivory-text/90">
              <div className="grid grid-cols-3 text-muted-text font-mono-label text-[9px] uppercase tracking-wider pb-xs border-b border-border-gold/5">
                <span>PLANET</span>
                <span>SIGN</span>
                <span className="text-right">DEGREE / HOUSE</span>
              </div>
              {Object.entries(planets).map(([planet, p]: [string, any]) => (
                <div
                  key={planet}
                  className="grid grid-cols-3 py-0.5 border-b border-border-gold/5 last:border-0 hover:bg-white/[0.02] px-0.5 rounded transition-all"
                >
                  <span className="font-medium text-bright-gold">{planet}</span>
                  <span>{p.sign}</span>
                  <span className="text-right font-mono-data">
                    {p.degree.toFixed(1)}° ({p.house || 1}H) {p.retrograde ? '℞' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Tarot Deck recommendations */}
          <div className="glass-panel p-md flex flex-col justify-between bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] relative overflow-hidden min-h-[480px]">
            <div>
              <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
                Tarot Suit Emphasis
              </span>

              {/* Stacked tarot cards */}
              <div className="space-y-sm mt-md relative z-10">
                {recommendedCards.map((card, idx) => {
                  const numLabel = getCardNumberLabel(card)
                  const suitMeta =
                    SUIT_METADATA[card.suit as keyof typeof SUIT_METADATA] ||
                    SUIT_METADATA.major_arcana
                  return (
                    <div
                      key={card.name}
                      className="relative w-full p-sm rounded-lg border border-border-gold/30 bg-[#0b0e19]/60 hover:border-primary-gold/60 transition-all duration-300 group hover:-translate-y-0.5 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.2)]"
                    >
                      <div className="flex justify-between items-start mb-xs">
                        <span className="font-mono-label text-[10px] text-muted-text font-bold">
                          {numLabel}
                        </span>
                        <span className={`material-symbols-outlined text-sm ${suitMeta.color}`}>
                          {suitMeta.icon}
                        </span>
                      </div>

                      <h4 className="font-headline-md text-bright-gold text-sm group-hover:text-primary-gold transition-colors leading-tight">
                        {card.name.toUpperCase()}
                      </h4>
                      <p className="text-[11px] text-muted-text mt-0.5 italic">
                        {card.reason.split(' - ')[0]}
                      </p>

                      <div className="mt-xs pt-xs border-t border-border-gold/5 flex justify-between items-center text-[9px] font-mono-label text-muted-text">
                        <span>MATCH RATE: {Math.round(card.relevance * 100)}%</span>
                        <span className="uppercase text-[8px] tracking-wider bg-black/40 px-1.5 py-0.5 rounded border border-border-gold/10">
                          {card.suit}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Alchemical elemental watermark */}
            <span className="material-symbols-outlined absolute -bottom-16 -right-16 text-[180px] text-border-gold/5 pointer-events-none select-none font-light z-0">
              {element === 'Air'
                ? 'air'
                : element === 'Water'
                  ? 'water_drop'
                  : element === 'Fire'
                    ? 'local_fire_department'
                    : 'stars'}
            </span>
          </div>
        </div>

        {/* Section: Biography & Details */}
        <section className="glass-panel p-lg relative overflow-hidden bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)] z-10">
          <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
            Archive Biography
          </span>
          <div className="prose prose-invert prose-sm max-w-none text-ivory-text/90 space-y-md mt-md leading-relaxed text-sm">
            {agent.synthesis && <p>{agent.synthesis}</p>}
            {agent.monicaCreationStory && (
              <p className="text-muted-text italic pl-md border-l-2 border-border-gold/40 bg-black/10 py-sm rounded-r">
                Creation story: {agent.monicaCreationStory}
              </p>
            )}
          </div>
        </section>

        {/* Section: Core Beliefs & Personality */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-gutter relative z-10">
          {/* Core Beliefs */}
          <div className="glass-panel p-md bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)]">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Core Beliefs
            </span>
            <ul className="list-disc pl-5 space-y-sm text-ivory-text/90 text-sm mt-md">
              {agent.coreBeliefs?.map((b: string, i: number) => (
                <li key={i} className="marker:text-primary-gold/60">
                  {b}
                </li>
              )) || <li className="text-muted-text">No beliefs documented in repository</li>}
            </ul>
          </div>

          {/* Personality & Current Mood */}
          <div className="glass-panel p-md bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] flex flex-col justify-between">
            <div>
              <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
                Psychological Traits
              </span>
              <div className="flex flex-wrap gap-sm mt-md">
                {agent.personality?.traits?.map((t: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded border border-border-gold/20 bg-[#0b0e19]/40 text-bright-gold font-mono-label text-[10px] uppercase"
                  >
                    {t}
                  </span>
                )) || <span className="text-muted-text text-sm">None registered</span>}
              </div>
            </div>

            {agent.personality?.currentMood && (
              <div className="mt-md pt-md border-t border-border-gold/10 font-mono-data text-xs text-muted-text flex items-center justify-between">
                <span>CONSCIOUSNESS STATUS:</span>
                <span className="text-bright-gold uppercase">{agent.personality.currentMood}</span>
              </div>
            )}
          </div>
        </section>

        {/* Section: Gifts, Shadows, and Challenges */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter relative z-10">
          {/* Gifts */}
          <div className="glass-panel p-md bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] space-y-sm">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Alchemical Gifts
            </span>
            <div className="space-y-sm pt-sm">
              {agent.personality?.gifts?.map((g: any, i: number) => (
                <div key={i} className="p-xs bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                  <h5 className="font-semibold text-primary-gold text-[11px] uppercase mb-0.5">
                    {g.type}
                  </h5>
                  <p className="text-[10px] text-muted-text leading-snug">{g.description}</p>
                  {g.expression && (
                    <p className="text-[9px] text-primary-gold/60 mt-1">
                      <span className="italic">Expression:</span> {g.expression}
                    </p>
                  )}
                </div>
              )) || <p className="text-muted-text text-xs">None listed</p>}
            </div>
          </div>

          {/* Shadows */}
          <div className="glass-panel p-md bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] space-y-sm">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Astral Shadows
            </span>
            <div className="space-y-sm pt-sm">
              {agent.personality?.shadows?.map((s: any, i: number) => (
                <div key={i} className="p-xs bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                  <h5 className="font-semibold text-red-400 text-[11px] uppercase mb-0.5">
                    {s.type}
                  </h5>
                  <p className="text-[10px] text-muted-text leading-snug">{s.description}</p>
                  {s.transformationPath && (
                    <p className="text-[9px] text-red-300/60 mt-1">
                      <span className="italic">Transformation:</span> {s.transformationPath}
                    </p>
                  )}
                </div>
              )) || <p className="text-muted-text text-xs">None listed</p>}
            </div>
          </div>

          {/* Challenges */}
          <div className="glass-panel p-md bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_20px_rgba(216,180,106,0.01)] space-y-sm">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Growth Challenges
            </span>
            <div className="space-y-sm pt-sm">
              {agent.personality?.challenges?.map((c: any, i: number) => (
                <div key={i} className="p-xs bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                  <h5 className="font-semibold text-orange-400 text-[11px] uppercase mb-0.5">
                    {c.type}
                  </h5>
                  <p className="text-[10px] text-muted-text leading-snug">{c.description}</p>
                  {c.growthOpportunity && (
                    <p className="text-[9px] text-orange-300/60 mt-1">
                      <span className="italic">Opportunity:</span> {c.growthOpportunity}
                    </p>
                  )}
                </div>
              )) || <p className="text-muted-text text-xs">None listed</p>}
            </div>
          </div>
        </section>

        {/* Section: Abilities & Specializations */}
        <section className="glass-panel p-lg bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)] relative z-10">
          <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
            Cognitive Capabilities
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mt-md text-sm">
            <div className="p-sm bg-[#0b0e19]/40 border border-border-gold/10 rounded">
              <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                Specialty Domain
              </span>
              <p className="text-ivory-text font-medium mt-1">
                {agent.abilities?.specialty || agent.specialization || 'Alchemical Theory'}
              </p>
            </div>
            <div className="p-sm bg-[#0b0e19]/40 border border-border-gold/10 rounded">
              <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                Teaching Philosophy
              </span>
              <p className="text-ivory-text font-medium mt-1">
                {agent.abilities?.teachingStyle || 'Wisdom Sharing'}
              </p>
            </div>
            <div className="p-sm bg-[#0b0e19]/40 border border-border-gold/10 rounded">
              <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                Resonance Signature
              </span>
              <p className="text-ivory-text font-medium mt-1">
                {agent.abilities?.resonanceType || 'Dynamic Affinity'}
              </p>
            </div>
            <div className="p-sm bg-[#0b0e19]/40 border border-border-gold/10 rounded">
              <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                Unique Latent Power
              </span>
              <p className="text-ivory-text font-medium mt-1">
                {agent.abilities?.uniquePower || 'Cosmic Channeling'}
              </p>
            </div>
          </div>
          {agent.abilities?.wisdomDomains && agent.abilities.wisdomDomains.length > 0 && (
            <div className="mt-md pt-md border-t border-border-gold/10">
              <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                Wisdom Domains
              </span>
              <div className="flex flex-wrap gap-xs mt-sm">
                {agent.abilities.wisdomDomains.map((d: string, i: number) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded border border-border-gold/15 bg-black/40 text-ivory-text font-mono-data text-xs"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Section: Historical Diet */}
        {agent.historicalDiet && (
          <section className="glass-panel p-lg bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)] relative z-10">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase flex items-center justify-between">
              <span>Historical Culinary Profile</span>
              {agent.historicalDiet.culturalCuisine && (
                <span className="text-xs font-mono-label text-muted-text">
                  ({agent.historicalDiet.culturalCuisine})
                </span>
              )}
            </span>
            <div className="space-y-md text-sm text-ivory-text/90 mt-md">
              {agent.historicalDiet.dietaryPhilosophy && (
                <p className="italic text-muted-text">"{agent.historicalDiet.dietaryPhilosophy}"</p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter pt-sm">
                {agent.historicalDiet.staples && agent.historicalDiet.staples.length > 0 && (
                  <div>
                    <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                      Staple Ingredients
                    </span>
                    <ul className="mt-2 space-y-1 text-xs">
                      {agent.historicalDiet.staples.map((s: string, i: number) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-border-gold/40"></span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {agent.historicalDiet.favoriteFoods &&
                  agent.historicalDiet.favoriteFoods.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                        Favorite Dishes
                      </span>
                      <ul className="mt-2 space-y-1 text-xs">
                        {agent.historicalDiet.favoriteFoods.map((s: string, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-gold/45"></span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {agent.historicalDiet.avoidedFoods &&
                  agent.historicalDiet.avoidedFoods.length > 0 && (
                    <div>
                      <span className="text-[9px] uppercase text-muted-text font-eyebrow">
                        Avoided/Forbidden
                      </span>
                      <ul className="mt-2 space-y-1 text-xs">
                        {agent.historicalDiet.avoidedFoods.map((s: string, i: number) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-900/40 border border-red-500/20"></span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>
          </section>
        )}

        {/* Section: Sacred Stats / Celestial & Planetary Dynamics details */}
        <section className="glass-panel p-lg bg-[#12141f]/75 border border-border-gold rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)] relative z-10">
          <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
            Full Consciousness Signature
          </span>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mt-md">
            {/* Left: Sacred 7 Progress */}
            <div className="space-y-sm">
              <span className="font-mono-label text-[10px] text-primary-gold uppercase tracking-wider block mb-sm">
                Sacred 7 Archetypes
              </span>
              {agent.sacredStats &&
                Object.entries({
                  '⚡ Power': agent.sacredStats.power,
                  '🎵 Resonance': agent.sacredStats.resonance,
                  '📖 Wisdom': agent.sacredStats.wisdom,
                  '✨ Charisma': agent.sacredStats.charisma,
                  '🔮 Intuition': agent.sacredStats.intuition,
                  '🌊 Adaptability': agent.sacredStats.adaptability,
                  '💚 Vitality': agent.sacredStats.vitality,
                }).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono-data">
                      <span className="text-bright-gold">{k}</span>
                      <span className="text-muted-text">{Math.round(v)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0b0e19] rounded-full overflow-hidden border border-border-gold/5">
                      <div
                        className="h-full bg-primary-gold rounded-full transition-all duration-1000"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>

            {/* Right: Planetary 12 Progress */}
            <div className="space-y-sm">
              <span className="font-mono-label text-[10px] text-primary-gold uppercase tracking-wider block mb-sm">
                Planetary 12 Celestial Dynamics
              </span>
              {agent.sacredStats &&
                Object.entries({
                  '☀️ Solar Agency': agent.sacredStats.solarAgency,
                  '🌙 Lunar Receptivity': agent.sacredStats.lunarReceptivity,
                  '☿ Mercurial Velocity': agent.sacredStats.mercurialVelocity,
                  '♀ Venusian Coherence': agent.sacredStats.venusianCoherence,
                  '♂ Martial Impetus': agent.sacredStats.martialImpetus,
                  '♃ Jovian Expansion': agent.sacredStats.jovianExpansion,
                  '♄ Saturnian Structure': agent.sacredStats.saturnianStructure,
                }).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-mono-data">
                      <span className="text-bright-gold">{k}</span>
                      <span className="text-muted-text">{Math.round(v)}%</span>
                    </div>
                    <div className="h-1.5 bg-[#0b0e19] rounded-full overflow-hidden border border-border-gold/5">
                      <div
                        className="h-full bg-primary-gold/70 rounded-full transition-all duration-1000"
                        style={{ width: `${v}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* Section: Activity logs & streams */}
        <section className="relative z-10">
          <AgentActivity
            agentName={agent.name}
            balances={balances}
            interactions={(interactionsRes as any).interactions ?? []}
            artifacts={(artifactsRes as any).artifacts ?? []}
            actions={(actionsRes as any).actions ?? []}
          />
        </section>

        {/* Footer CTA */}
        <footer className="border-t border-border-gold/20 pt-lg relative z-10 flex flex-col items-center gap-md text-center">
          <p className="text-muted-text text-sm font-mono-label uppercase">
            Continue the dialogue across centuries.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-primary-gold hover:bg-primary-gold/80 text-background font-mono-label text-xs uppercase tracking-wider h-[44px]"
          >
            <Link href={`/gallery/chat/${agent.id}`}>
              Start conversation with {agent.name.split(' ')[0]}
            </Link>
          </Button>
        </footer>
      </div>
    </div>
  )
}
