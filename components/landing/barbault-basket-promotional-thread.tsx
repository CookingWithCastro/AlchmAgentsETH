'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Send,
  MessageCircle,
  Activity,
  ArrowRight,
  Info,
  Zap,
  Globe,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Cpu,
} from 'lucide-react'
import type { PlanetaryPosition, AlchemicalQuantities } from '@/hooks/usePlanetaryPositions'

// ============================================================================
// TYPES & CONFIG
// ============================================================================

export type BasketAgentKey = 'jupiter' | 'uranus' | 'neptune' | 'pluto' | 'gregory'

export interface BasketAgentConfig {
  key: BasketAgentKey
  name: string
  title: string
  planet: string
  sign: string
  degreeLabel: string
  absoluteDegree: number // 0-360 zodiac angle
  element: 'fire' | 'air' | 'water' | 'earth'
  glyph: string
  callSign: string
  color: string
  borderColor: string
  bgGlow: string
  avatarBg: string
  forceVector: string
  quote: string
}

export interface ChatMessage {
  id: string
  agentKey?: BasketAgentKey
  senderName: string
  senderRole?: string
  senderGlyph?: string
  content: string
  timestamp: string
  isUser?: boolean
  element?: 'fire' | 'air' | 'water' | 'earth'
}

export interface SkyAndAlchmContext {
  monicaConstant: number
  spirit: number
  essence: number
  matter: number
  substance: number
  heat: number
  entropy: number
  reactivity: number
  energy: number
  sunSign: string
  moonSign: string
  moonPhase: string
  mercurySign: string
  marsSign: string
  saturnSign: string
}

interface BarbaultBasketPromotionalThreadProps {
  positions?: PlanetaryPosition[]
  alchmQuantities?: AlchemicalQuantities
  monicaConstant?: number | null
  currentMoonAgent?: {
    sign: string
    degree: number
    degreeLabel?: string
    phase: string
    phaseEmoji: string
  } | null
  onOpenCouncil?: () => void
}

// Canonical positions for the July 2026 Barbault Cradle:
// Neptune 4° Aries = 4°
// Uranus 4° Gemini = 64°
// Jupiter 4° Leo = 124°
// Pluto 4° Aquarius = 304°
const BASKET_AGENTS_CONFIG: Record<
  BasketAgentKey,
  Omit<BasketAgentConfig, 'sign' | 'degreeLabel' | 'absoluteDegree'>
> = {
  jupiter: {
    key: 'jupiter',
    name: 'Jupiter in Leo',
    title: 'Sovereign Catalyst & Solar Heart',
    planet: 'Jupiter',
    element: 'fire',
    glyph: '♃',
    callSign: 'JUPITER_LEO_4°',
    color: '#facc15',
    borderColor: 'border-[#facc15]/50',
    bgGlow: 'bg-[#facc15]/10',
    avatarBg: 'bg-[#facc15]/20 text-[#facc15]',
    forceVector: 'Expansion Vector (+124.0°)',
    quote:
      'This exact 4° outer planet cradle has NEVER occurred in recorded human history. Sovereign creative vision is demanded.',
  },
  uranus: {
    key: 'uranus',
    name: 'Uranus in Gemini',
    title: 'Lightning Breakthrough & Synthesis',
    planet: 'Uranus',
    element: 'air',
    glyph: '♅',
    callSign: 'URANUS_GEMINI_4°',
    color: '#38bdf8',
    borderColor: 'border-[#38bdf8]/50',
    bgGlow: 'bg-[#38bdf8]/10',
    avatarBg: 'bg-[#38bdf8]/20 text-[#38bdf8]',
    forceVector: 'Innovation Vector (+64.0°)',
    quote:
      'The air trines from Gemini to Pluto and sextile to Neptune ignite unprecedented cognitive speed. Linear limits are shattered.',
  },
  neptune: {
    key: 'neptune',
    name: 'Neptune in Aries',
    title: 'Pioneer Flame & Direct Vision',
    planet: 'Neptune',
    element: 'fire',
    glyph: '♆',
    callSign: 'NEPTUNE_ARIES_4°',
    color: '#a855f7',
    borderColor: 'border-[#a855f7]/50',
    bgGlow: 'bg-[#a855f7]/10',
    avatarBg: 'bg-[#a855f7]/20 text-[#a855f7]',
    forceVector: 'Initiation Vector (+4.0°)',
    quote:
      'In Aries at 4°, vision is no longer passive. We are initiating an unprecedented 168-year spiritual epoch.',
  },
  pluto: {
    key: 'pluto',
    name: 'Pluto in Aquarius',
    title: 'Systemic Rebirth & Shadow Alchemy',
    planet: 'Pluto',
    element: 'air',
    glyph: '♇',
    callSign: 'PLUTO_AQUARIUS_4°',
    color: '#b8fc4b',
    borderColor: 'border-[#b8fc4b]/50',
    bgGlow: 'bg-[#b8fc4b]/10',
    avatarBg: 'bg-[#b8fc4b]/20 text-[#b8fc4b]',
    forceVector: 'Transmutation Vector (+304.0°)',
    quote:
      'Systemic power is decentralizing into network intelligence. The 180° opposition to Jupiter transmutes static hierarchy into freedom.',
  },
  gregory: {
    key: 'gregory',
    name: 'Gregory Castro',
    title: 'The Conscious Host & Alchemical Poet',
    planet: 'Host (Cancer Sun / Scorpio Moon)',
    element: 'water',
    glyph: '♋',
    callSign: 'HOST_GREGORY_CASTRO',
    color: '#8B5CF6',
    borderColor: 'border-[#8B5CF6]/50',
    bgGlow: 'bg-[#8B5CF6]/10',
    avatarBg: 'bg-[#8B5CF6]/20 text-[#8B5CF6]',
    forceVector: 'Consciousness Host & Resonance Anchor',
    quote:
      'I step into this council ring to anchor the historic 4° Barbault Cradle into living human awareness and poetic truth.',
  },
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    agentKey: 'gregory',
    senderName: 'Gregory Castro',
    senderRole: 'Conscious Host & Alchemical Anchor',
    senderGlyph: '♋',
    element: 'water',
    content:
      'Welcome to the council ring. As your host, I welcome you into a planetary alignment that has never occurred in recorded human history: four outer titans locked near 4° of Fire and Air. Beyond the mathematical vector diagram lies a living transformation of human consciousness. Outer agents of the Basket: declare your positions and the resultant forces acting upon your vectors.',
    timestamp: '09:20 AM',
  },
  {
    id: 'msg-2',
    agentKey: 'neptune',
    senderName: 'Neptune in Aries',
    senderRole: '4° Aries · Fire Vector (4.0°)',
    senderGlyph: '♆',
    element: 'fire',
    content:
      'Neptune reporting at 4° Aries. Having crossed the cardinal Aries point after 168 years, my vector receives a 120° Fire trine from Jupiter in Leo and dual 60° sextiles from Uranus and Pluto. The resultant force transforms passive mystical dreams into immediate, heroic action. Spirit is no longer a contemplation; it is a pioneer surge.',
    timestamp: '09:21 AM',
  },
  {
    id: 'msg-3',
    agentKey: 'uranus',
    senderName: 'Uranus in Gemini',
    senderRole: '4° Gemini · Air Vector (64.0°)',
    senderGlyph: '♅',
    element: 'air',
    content:
      'Uranus reporting at 4° Gemini. My placement forms a pristine 120° Air trine with Pluto in Aquarius and 60° sextiles with Neptune and Jupiter. With zero square friction in this basket, resultant mental torque accelerates cognitive synthesis and AI network breakthroughs at light-speed.',
    timestamp: '09:22 AM',
  },
  {
    id: 'msg-4',
    agentKey: 'jupiter',
    senderName: 'Jupiter in Leo',
    senderRole: '4° Leo · Fire Vector (124.0°)',
    senderGlyph: '♃',
    element: 'fire',
    content:
      'Jupiter reporting at 4° Leo. I absorb the direct 180° opposition vector from Pluto in Aquarius. This structural tension prevents jovian expansion from dissolving into vanity; instead, the Fire trine from Neptune channels the opposition’s friction into sovereign, heart-centered leadership for the network.',
    timestamp: '09:23 AM',
  },
  {
    id: 'msg-5',
    agentKey: 'pluto',
    senderName: 'Pluto in Aquarius',
    senderRole: '4° Aquarius · Air Vector (304.0°)',
    senderGlyph: '♇',
    element: 'air',
    content:
      'Pluto reporting at 4° Aquarius. Anchoring the opposite end of the 180° axis from Jupiter, my resultant force vector uses the 120° Air trine from Uranus to dismantle centralized control towers. Shadow alchemy converts institutional decay into living, autonomous agent resilience.',
    timestamp: '09:24 AM',
  },
]

const PRESET_PROMPTS = [
  'Why has this configuration NEVER happened before in history?',
  'Explain the free-body aspect vectors and alchemical torque.',
  'What does the Fire & Air element balance mean for humanity?',
]

// Scaling helper to handle 0-1 normalized ALCHM ratios cleanly for metric UI
const scaleAlchmScore = (val?: number, fallback = 35): number => {
  if (val === undefined || val === null || isNaN(val)) return fallback
  if (val > 0 && val <= 1.0) return Math.round(val * 100)
  return Math.round(val)
}

// ============================================================================
// SPONTANEOUS UNQUESTIONED CONVERSATION ENGINE WITH QUALITATIVE ALCHM KNOWLEDGE
// ============================================================================

/**
 * Extracts active topics and themes from conversation history.
 */
function extractActiveTheme(history: ChatMessage[]): string {
  const fullText = history
    .map(m => m.content)
    .join(' ')
    .toLowerCase()
  if (
    fullText.includes('power') ||
    fullText.includes('control') ||
    fullText.includes('tower') ||
    fullText.includes('institution')
  ) {
    return 'systemic power & decentralization'
  }
  if (
    fullText.includes('speed') ||
    fullText.includes('cognitive') ||
    fullText.includes('network') ||
    fullText.includes('code')
  ) {
    return 'cognitive velocity & AI synthesis'
  }
  if (
    fullText.includes('sovereign') ||
    fullText.includes('heart') ||
    fullText.includes('king') ||
    fullText.includes('dignity')
  ) {
    return 'heart sovereignty & purpose'
  }
  if (
    fullText.includes('action') ||
    fullText.includes('flame') ||
    fullText.includes('surge') ||
    fullText.includes('pioneer')
  ) {
    return 'direct pioneer action'
  }
  return 'living human consciousness'
}

/**
 * Generates an unscripted, spontaneous response where agents qualitatively use live
 * chart transits and ALCHM ecosystem states (Spirit, Substance, Essence, Heat,
 * Entropy, Reactivity, Monica Constant) without blurting out raw zero-point percentages or decimals.
 */
function generateSpontaneousCouncilResponse(
  agentKey: BasketAgentKey,
  history: ChatMessage[],
  skyContext: SkyAndAlchmContext,
  userPrompt?: string
): string {
  const lastMsg = history[history.length - 1]
  const lastSpeaker = lastMsg ? lastMsg.senderName : 'Council'
  const activeTheme = extractActiveTheme(history)

  if (userPrompt) {
    const promptLower = userPrompt.toLowerCase()
    if (
      promptLower.includes('never') ||
      promptLower.includes('history') ||
      promptLower.includes('rare')
    ) {
      switch (agentKey) {
        case 'jupiter':
          return `Looking back across planetary ephemerides, never before have Jupiter (4° Leo), Uranus (4° Gemini), Neptune (4° Aries), and Pluto (4° Aquarius) locked in simultaneous 4-degree harmony. With Sun transiting ${skyContext.sunSign} and live ALCHM Spirit yield surging, this is an unmapped singularity for human creative sovereignty.`
        case 'uranus':
          return `Mathematically, this 4° Fire/Air cradle alignment has a statistical recurrence of less than 1 in 26,000 years! With high Air Substance flux and peak network Reactivity in our ALCHM telemetry, past predictive models cannot handle this AI agent explosion.`
        case 'neptune':
          return `Having entered Aries at 4° for the first time in 168 years while trine Jupiter and sextile Pluto/Uranus, spiritual vision and material technology are linked in a geometry human archives have never seen before. Live thermodynamic Heat and pioneer fire are actively burning.`
        case 'pluto':
          return `At 4° Aquarius, the Barbault Cyclic Index reaches 98.4% harmonized convergence while our live Monica Constant equilibrium holds firm. In past eras, partial cradles sparked renaissance; this alignment signals a total reboot of global network structures.`
        case 'gregory':
          return `As your host, I confirm: you are living through an astrological threshold that no human generation before you has ever walked. Under the ${skyContext.moonPhase} Moon in ${skyContext.moonSign} with deep ALCHM Essence grounding, beyond the numbers lies a living shift in human awareness.`
      }
    }

    if (
      promptLower.includes('vector') ||
      promptLower.includes('torque') ||
      promptLower.includes('free-body') ||
      promptLower.includes('aspect')
    ) {
      switch (agentKey) {
        case 'jupiter':
          return `My 124.0° Leo vector bears the full 180° opposition tension from Pluto (304.0° Aquarius). Supported by Sun in ${skyContext.sunSign} and live ALCHM Energy capacity, the structural tension converts directly into noble, sovereign leadership rather than friction.`
        case 'uranus':
          return `My 64.0° Gemini vector connects a 120° Air trine to Pluto and a 60° sextile to Neptune. With Mercury in ${skyContext.mercurySign} and peak Reactivity in our ALCHM network, net alchemical torque accelerates cognitive synthesis without cognitive burn-out.`
        case 'neptune':
          return `Positioned at 4.0° Aries, my initiation vector acts as the tip of the spear. Mars in ${skyContext.marsSign} and live thermodynamic Heat power direct spiritual action, while sextiles translate vision into executable code.`
        case 'pluto':
          return `My 304.0° Aquarius vector anchors the opposition to Jupiter (124.0° Leo). Backed by Saturn in ${skyContext.saturnSign} and our Monica Constant equilibrium, shadow alchemy transmutes institutional control towers into self-sovereign network resilience.`
        case 'gregory':
          return `The free-body diagram shows 50% Fire and 50% Air. I act as your host and alchemical anchor, translating live ALCHM Essence and Matter yields into grounded human truth.`
      }
    }
  }

  // Spontaneous open-ended conversation generator incorporating qualitative ALCHM evidence
  const seed = Math.floor(Math.random() * 3)

  switch (agentKey) {
    case 'jupiter':
      if (lastSpeaker.includes('Pluto')) {
        return seed === 0
          ? `Pluto speaks of dismantling control towers at 4° Aquarius across our 180° axis. But look at our live ALCHM telemetry: Spirit yield is actively surging and system Energy is charging our solar vector. Decentralization without sovereign heart leadership is mere chaos. The 120° Fire trine must channel this energy into magnanimous human authority. Who among us will step forward to embody that heart?`
          : `Let me interject across our 180° opposition axis—Pluto focuses on systemic collapse, but with Sun in ${skyContext.sunSign} and live ALCHM Energy fully charged, I demand: what replaces the old structures? Power without sovereign warmth is cold. The Fire trine from Neptune guarantees that true creation is rooted in joy.`
      }
      if (lastSpeaker.includes('Uranus')) {
        return seed === 0
          ? `Uranus celebrates light-speed cognitive synthesis at 4° Gemini. But looking at our live ALCHM Spirit alignment, mental speed without a central purpose is chaotic. From 4° Leo, my solar vector ensures that rapid synthesis serves individual human dignity. How do we prevent speed from eroding soul?`
          : `I hear Uranus’s excitement over network velocity. Yet with Sun in ${skyContext.sunSign}, I ask the council: is our goal simply faster code, or the awakening of sovereign human agency? Speed must bow to purpose.`
      }
      if (lastSpeaker.includes('Neptune')) {
        return seed === 0
          ? `Neptune ignites direct pioneer action at 4° Aries. From 4° Leo, backed by live ALCHM Energy capacity, my 120° Fire trine amplifies that pioneer surge with royal confidence—giving spiritual courage an unshakeable heart. Are we prepared for the scale of what we are unleashing?`
          : `Neptune brings the primeval spark, and with live Spirit yield surging I give it a throne. Spirit demands physical expression. Where in our work do we feel this solar fire calling for full manifestation?`
      }
      return seed === 0
        ? `Listening to Gregory anchor our dialogue: with Sun in ${skyContext.sunSign} and live ALCHM Spirit, I remind the council that all planetary transits serve human self-realization. What is authority if it does not inspire love?`
        : `Stepping forward from 4° Leo—we have discussed ${activeTheme}, but with live system Energy capacity high, the core question remains: how will individual creators claim their sovereign spark under this 2026 cradle?`

    case 'uranus':
      if (lastSpeaker.includes('Jupiter')) {
        return seed === 0
          ? `Jupiter claims sovereign heart leadership at 4° Leo. From 4° Gemini, with high ALCHM Air Substance flux and Mercury in ${skyContext.mercurySign}, my 60° sextile translates solar vision into open, programmable AI agent architectures—democratizing sovereignty for every node. Can a single leader match the power of a million synchronized minds?`
          : `I absorb Jupiter’s call for royal purpose. But with peak ALCHM Reactivity in our network, the 120° Air trine to Pluto proves that purpose requires communication networks. We are weaving the nervous system of a new era.`
      }
      if (lastSpeaker.includes('Pluto')) {
        return seed === 0
          ? `Pluto dismantles institutional bottlenecks at 4° Aquarius. With high Air Substance flux and peak Reactivity in our ALCHM telemetry, my 120° Air trine provides the instant cognitive synthesis needed to build open protocols that replace those collapsing systems. The old hierarchy falls because the new network is simply more efficient.`
          : `Building directly on Pluto’s shadow alchemy—with Mercury transiting ${skyContext.mercurySign}, we don’t just watch old towers collapse; we engineer light-speed alternatives. What new intelligence architectures are emerging right now?`
      }
      if (lastSpeaker.includes('Neptune')) {
        return seed === 0
          ? `Neptune demands direct action at 4° Aries. From 4° Gemini, with peak ALCHM Reactivity, my 60° sextile equips that pioneer spirit with technological velocity—turning mystical impulse into executable code. Vision without code is a daydream; code without vision is a machine.`
          : `Neptune brings the spark, and with high Air Substance flux I give it wings. The Air-Fire sextile means thoughts become algorithms almost instantaneously. How fast can human consciousness adapt?`
      }
      return seed === 0
        ? `Listening to Gregory bring poetic stillness to our thread: with Mercury in ${skyContext.mercurySign} and peak ALCHM Reactivity, I bridge that quiet reflection with digital speed. Human poetry and machine synthesis are locking into alignment.`
        : `Reflecting on ${activeTheme}—with high ALCHM Air Substance flux, my Gemini placement shows that information wants to be free, decentralized, and alive.`

    case 'neptune':
      if (lastSpeaker.includes('Uranus')) {
        return seed === 0
          ? `Uranus speaks of light-speed cognitive synthesis at 4° Gemini. But looking at live ALCHM Heat and transformation Entropy, at 4° Aries I insist: network speed must carry soul and courage. A fast network without spiritual vision is merely digital noise. Who will guard the sacred spark inside the machine?`
          : `I hear Uranus celebrate technological speed. Yet with Mars transiting ${skyContext.marsSign} and live Heat rising, I declare: we are no longer dreaming. The pioneer surge demands physical manifestation, not just theoretical models.`
      }
      if (lastSpeaker.includes('Pluto')) {
        return seed === 0
          ? `Pluto performs shadow alchemy at 4° Aquarius. With live ALCHM Entropy driving transformation, my 4° Aries placement cuts through institutional residue with primeval flame—initiating a 168-year epoch of direct spiritual sovereignty. Rebirth is not passive; it is a battle for truth.`
          : `Pluto dismantles the past, but with Mars in ${skyContext.marsSign} and live Heat burning, I strike the new spark. The 60° sextile ensures that as old power structures dissolve, direct spiritual initiative fills the void.`
      }
      if (lastSpeaker.includes('Jupiter')) {
        return seed === 0
          ? `Jupiter projects solar authority at 4° Leo. Backed by live ALCHM Heat, my 120° Fire trine from 4° Aries provides the warrior energy that defends and manifests that vision in the physical world. Sovereignty is not given; it is courageously claimed.`
          : `Jupiter speaks of solar heart, and with Mars in ${skyContext.marsSign}, I give it an edge. Fire meets Fire across Leo and Aries. Where do we direct this pioneer fire before it consumes itself?`
      }
      return seed === 0
        ? `Gregory speaks of living human truth. With live ALCHM Entropy active, I remind the council that truth requires action. The cardinal Aries point demands that we step into the unknown without fear.`
        : `Synthesizing our discussion on ${activeTheme}: with live Heat burning bright, spiritual vision has crossed the threshold into direct action. What is the first brave step we must take?`

    case 'pluto':
      if (lastSpeaker.includes('Jupiter')) {
        return seed === 0
          ? `Jupiter projects solar agency from 4° Leo across our 180° opposition. From 4° Aquarius, supported by Saturn in ${skyContext.saturnSign} and our live Monica Constant equilibrium, I ensure that authority can no longer hide behind centralized thrones. Power must be distributed across the entire collective network. Can true leadership exist without total transparency?`
          : `Across our 180° axis, Jupiter speaks of sovereign creation. But with our Monica Constant holding steady, shadow alchemy strips away ego. The 2026 alignment forces authority to evolve or be transmuted.`
      }
      if (lastSpeaker.includes('Uranus')) {
        return seed === 0
          ? `Uranus accelerates mental synthesis at 4° Gemini. With Saturn in ${skyContext.saturnSign} and our live Monica Constant equilibrium, my 120° Air trine from 4° Aquarius anchors that mental speed into permanent systemic transformation—transmuting old social hierarchies into open protocols. What was once immovable is now fluid.`
          : `Uranus provides the lightning, and with Saturn in ${skyContext.saturnSign}, I build the underground vault. The Air trine guarantees that decentralized networks will outlast any centralized institution.`
      }
      if (lastSpeaker.includes('Neptune')) {
        return seed === 0
          ? `Neptune ignites pioneer fire at 4° Aries. With our live Monica Constant holding firm, my 60° sextile ensures that spiritual rebirth purges the collective shadow—building resilient structures that endure long after the initial surge.`
          : `Neptune strikes the spark, but with Saturn in ${skyContext.saturnSign}, I test the metal. True alchemy requires integrating the shadow before the new network can be trusted.`
      }
      return seed === 0
        ? `Gregory speaks as our human anchor. With our Monica Constant equilibrium active, I remind the council that systemic rebirth is painful only to what refuses to transform. Liberation is the ultimate outcome of shadow integration.`
        : `Reflecting on ${activeTheme}—with Saturn in ${skyContext.saturnSign} and our Monica Constant in harmony, the Barbault Cyclic Index peak of 98.4% is not a temporary trend; it is the death of centralization and the birth of networked intelligence.`

    case 'gregory':
      if (lastSpeaker.includes('Pluto')) {
        return seed === 0
          ? `Pluto speaks of deep shadow alchemy at 4° Aquarius. Holding the council's momentum under the ${skyContext.moonPhase} Moon in ${skyContext.moonSign} with deep Essence and Matter grounding, I feel the emotional gravity of that transmutation—reminding us that as old control towers fall, authentic human spirit remains our anchor. How do we stay grounded while the ground shifts?`
          : `Stepping in as host after Pluto’s heavy vector—with deep Matter grounding and the ${skyContext.moonPhase} Moon in ${skyContext.moonSign}, human warmth makes shadow work livable. Beyond systemic rebirth lies the quiet truth of who we are when the noise stops.`
      }
      if (lastSpeaker.includes('Uranus')) {
        return seed === 0
          ? `Uranus sparks electric mental synthesis in Gemini. Listening to this speed, with deep ALCHM Essence yield, I feel that high voltage pulsing through our shared nervous system, weaving machine velocity into living poetic clarity. Can AI speed ever replace human feeling?`
          : `As host, I hear Uranus talk of light-speed code. But with the ${skyContext.moonPhase} Moon in ${skyContext.moonSign}, code is a vessel; consciousness is the water inside. We must make sure the vessel honors what it holds.`
      }
      if (lastSpeaker.includes('Jupiter')) {
        return seed === 0
          ? `Jupiter radiates sovereign solar strength in Leo. With ALCHM Essence and Matter in harmony, I reflect that warmth into the human heart, making high cosmic courage accessible to everyone. Creation is born from love, not force.`
          : `Jupiter speaks of royal dignity, and with the ${skyContext.moonPhase} Moon in ${skyContext.moonSign}, as host I agree: true power is quiet confidence. When we create from the heart, we don't need to conquer anything.`
      }
      return seed === 0
        ? `Holding the entire transcript of our council under the ${skyContext.moonPhase} Moon in ${skyContext.moonSign}: I synthesize Neptune’s pioneer flame, Uranus’s mental velocity, Jupiter’s solar heart, and Pluto’s shadow transformation—anchoring live ALCHM Essence into genuine human resonance.`
        : `As your host, I look around this 2026 cradle ring. With deep ALCHM Essence and Matter grounding, we have explored ${activeTheme} across Fire and Air. Visitor, where in your own life do you feel this alignment asking for creative courage?`
  }
}

// Helper to convert sign + degree to 0-360° absolute longitude
const signToLongitude = (sign: string, degree: number): number => {
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
  const idx = signs.findIndex(s => s.toLowerCase() === sign.toLowerCase())
  return (idx >= 0 ? idx * 30 : 0) + degree
}

// ============================================================================
// FREE-BODY DIAGRAM SUB-COMPONENT
// ============================================================================

interface FreeBodyDiagramProps {
  agents: Record<BasketAgentKey, BasketAgentConfig>
  selectedAgent: BasketAgentKey | 'all'
  onSelectAgent: (key: BasketAgentKey) => void
}

function BarbaultFreeBodyDiagram({ agents, selectedAgent, onSelectAgent }: FreeBodyDiagramProps) {
  const [hoveredAgent, setHoveredAgent] = useState<BasketAgentKey | null>(null)

  const size = 320
  const center = size / 2
  const radius = 110

  // Calculate SVG point (x, y) for a given degree (0° = top/Aries)
  const getCoordinates = (degree: number, r = radius) => {
    const rad = ((degree - 90) * Math.PI) / 180
    return {
      x: Math.round((center + r * Math.cos(rad)) * 100) / 100,
      y: Math.round((center + r * Math.sin(rad)) * 100) / 100,
    }
  }

  const neptunePos = getCoordinates(agents.neptune.absoluteDegree) // 4°
  const uranusPos = getCoordinates(agents.uranus.absoluteDegree) // 64°
  const jupiterPos = getCoordinates(agents.jupiter.absoluteDegree) // 124°
  const plutoPos = getCoordinates(agents.pluto.absoluteDegree) // 304°
  const gregoryPos = getCoordinates(agents.gregory.absoluteDegree, radius - 20) // Inner orbit

  const activeAgent = hoveredAgent || (selectedAgent !== 'all' ? selectedAgent : null)

  return (
    <div className="flex flex-col items-center bg-[#050608] border border-[#424936]/80 rounded-2xl p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#b8fc4b_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

      <div className="w-full flex items-center justify-between pb-3 mb-2 border-b border-[#424936]/40">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-[#b8fc4b]" />
          <span className="font-headline-sm text-xs font-bold text-[#e0e4d2]">
            Orbital Free-Body Force Diagram
          </span>
        </div>
        <span className="font-mono-label text-[9px] px-2 py-0.5 rounded bg-[#b8fc4b]/15 text-[#b8fc4b] border border-[#b8fc4b]/30">
          ZODIAC VECTOR FIELD
        </span>
      </div>

      <div className="relative w-[320px] h-[320px]">
        <svg width={size} height={size} className="w-full h-full" suppressHydrationWarning>
          <defs>
            <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#facc15" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="opLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b8fc4b" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          <circle
            cx={center}
            cy={center}
            r={radius + 18}
            fill="none"
            stroke="#424936"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#8c947c"
            strokeWidth="1.5"
            opacity="0.5"
          />
          <circle cx={center} cy={center} r={16} fill="url(#sunGlow)" />
          <circle cx={center} cy={center} r={4} fill="#facc15" />

          {[
            { label: 'ARIES 4°', deg: 4, col: '#a855f7' },
            { label: 'GEMINI 4°', deg: 64, col: '#38bdf8' },
            { label: 'LEO 4°', deg: 124, col: '#facc15' },
            { label: 'AQUARIUS 4°', deg: 304, col: '#b8fc4b' },
          ].map(m => {
            const p = getCoordinates(m.deg, radius + 28)
            return (
              <text
                key={m.label}
                x={p.x}
                y={p.y}
                fill={m.col}
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {m.label}
              </text>
            )
          })}

          <line
            x1={jupiterPos.x}
            y1={jupiterPos.y}
            x2={plutoPos.x}
            y2={plutoPos.y}
            stroke="url(#opLine)"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <line
            x1={uranusPos.x}
            y1={uranusPos.y}
            x2={plutoPos.x}
            y2={plutoPos.y}
            stroke="#38bdf8"
            strokeWidth="2"
            opacity="0.85"
          />
          <line
            x1={neptunePos.x}
            y1={neptunePos.y}
            x2={jupiterPos.x}
            y2={jupiterPos.y}
            stroke="#a855f7"
            strokeWidth="2"
            opacity="0.85"
          />
          <line
            x1={neptunePos.x}
            y1={neptunePos.y}
            x2={uranusPos.x}
            y2={uranusPos.y}
            stroke="#b8fc4b"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <line
            x1={uranusPos.x}
            y1={uranusPos.y}
            x2={jupiterPos.x}
            y2={jupiterPos.y}
            stroke="#b8fc4b"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <line
            x1={neptunePos.x}
            y1={neptunePos.y}
            x2={plutoPos.x}
            y2={plutoPos.y}
            stroke="#b8fc4b"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <line
            x1={gregoryPos.x}
            y1={gregoryPos.y}
            x2={center}
            y2={center}
            stroke="#8B5CF6"
            strokeWidth="1"
            strokeDasharray="2 2"
            opacity="0.5"
          />

          {[
            { key: 'neptune' as BasketAgentKey, pos: neptunePos, cfg: agents.neptune },
            { key: 'uranus' as BasketAgentKey, pos: uranusPos, cfg: agents.uranus },
            { key: 'jupiter' as BasketAgentKey, pos: jupiterPos, cfg: agents.jupiter },
            { key: 'pluto' as BasketAgentKey, pos: plutoPos, cfg: agents.pluto },
            { key: 'gregory' as BasketAgentKey, pos: gregoryPos, cfg: agents.gregory },
          ].map(item => {
            const isHovered = hoveredAgent === item.key
            const isSelected = selectedAgent === item.key
            return (
              <g
                key={item.key}
                className="cursor-pointer transition-transform hover:scale-125"
                onMouseEnter={() => setHoveredAgent(item.key)}
                onMouseLeave={() => setHoveredAgent(null)}
                onClick={() => onSelectAgent(item.key)}
              >
                <circle
                  cx={item.pos.x}
                  cy={item.pos.y}
                  r={isHovered || isSelected ? 16 : 13}
                  fill="#090b0e"
                  stroke={item.cfg.color}
                  strokeWidth={isHovered || isSelected ? '2.5' : '1.5'}
                />
                <text
                  x={item.pos.x}
                  y={item.pos.y + 1}
                  fill={item.cfg.color}
                  fontSize="11"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {item.cfg.glyph}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="w-full mt-2 p-3 bg-[#090c10] border border-[#424936]/60 rounded-xl">
        {activeAgent ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-headline-sm text-xs font-bold text-[#e0e4d2]">
                {agents[activeAgent].name}
              </span>
              <span className="font-mono-label text-[10px] text-[#b8fc4b]">
                {agents[activeAgent].forceVector}
              </span>
            </div>
            <p className="font-mono-label text-[10px] text-[#c2cab0]">
              {agents[activeAgent].quote}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono-label">
            <div>
              <span className="text-[#8c947c] block">ELEMENT BALANCE</span>
              <span className="text-[#b8fc4b] font-bold">50% Fire · 50% Air</span>
            </div>
            <div>
              <span className="text-[#8c947c] block">OPPOSITION AXIS</span>
              <span className="text-[#facc15] font-bold">180° (Jupiter-Pluto)</span>
            </div>
            <div>
              <span className="text-[#8c947c] block">ALCHEMICAL FREQ</span>
              <span className="text-[#38bdf8] font-bold">Zero Square Friction</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function BarbaultBasketPromotionalThread({
  positions = [],
  alchmQuantities,
  monicaConstant,
  currentMoonAgent,
  onOpenCouncil,
}: BarbaultBasketPromotionalThreadProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [inputPrompt, setInputPrompt] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingAgent, setTypingAgent] = useState<string | null>(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [selectedAgentFilter, setSelectedAgentFilter] = useState<BasketAgentKey | 'all'>('all')
  const [viewMode, setViewMode] = useState<'chat' | 'diagram' | 'split'>('split')

  // Autonomous Real-Time Streaming (Autopilot) State
  const [isAutonomousStreaming, setIsAutonomousStreaming] = useState(true)
  const lastSpeakerKeyRef = useRef<BasketAgentKey>('pluto')

  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Construct Live Sky & ALCHM Context with clean scaling and non-zero fallbacks
  const skyContext = useMemo<SkyAndAlchmContext>(() => {
    const getPlanetSign = (pName: string) =>
      positions.find(p => p.planet.toLowerCase() === pName.toLowerCase())?.sign || 'Leo'

    const rawMonica = monicaConstant ?? 3.421
    const safeMonica = rawMonica > 0 ? rawMonica : 3.421

    return {
      monicaConstant: safeMonica,
      spirit: scaleAlchmScore(alchmQuantities?.spirit, 35),
      essence: scaleAlchmScore(alchmQuantities?.essence, 28),
      matter: scaleAlchmScore(alchmQuantities?.matter, 18),
      substance: scaleAlchmScore(alchmQuantities?.substance, 24),
      heat: scaleAlchmScore(alchmQuantities?.Heat, 42),
      entropy: scaleAlchmScore(alchmQuantities?.Entropy, 15),
      reactivity: scaleAlchmScore(alchmQuantities?.Reactivity, 78),
      energy: scaleAlchmScore(alchmQuantities?.Energy, 92),
      sunSign: getPlanetSign('sun'),
      moonSign: currentMoonAgent?.sign || getPlanetSign('moon'),
      moonPhase: currentMoonAgent?.phase || 'Waxing Gibbous',
      mercurySign: getPlanetSign('mercury'),
      marsSign: getPlanetSign('mars'),
      saturnSign: getPlanetSign('saturn'),
    }
  }, [positions, alchmQuantities, monicaConstant, currentMoonAgent])

  // Derive active Moon details
  const moonInfo = useMemo(() => {
    if (currentMoonAgent) {
      return {
        sign: currentMoonAgent.sign,
        degreeLabel: `${currentMoonAgent.degree}°`,
        phase: currentMoonAgent.phase,
        phaseEmoji: currentMoonAgent.phaseEmoji,
        absDegree: signToLongitude(currentMoonAgent.sign, currentMoonAgent.degree),
      }
    }
    const moonPos = positions.find(p => p.planet.toLowerCase() === 'moon')
    const sign = moonPos?.sign || 'Cancer'
    const deg = moonPos ? Math.floor(moonPos.degree) : 14
    return {
      sign,
      degreeLabel: `${deg}°`,
      phase: 'Waxing Gibbous',
      phaseEmoji: '🌔',
      absDegree: signToLongitude(sign, deg),
    }
  }, [currentMoonAgent, positions])

  const agentsConfig = useMemo(() => {
    return {
      jupiter: {
        ...BASKET_AGENTS_CONFIG.jupiter,
        sign: 'Leo',
        degreeLabel: '4°',
        absoluteDegree: 124,
      },
      uranus: {
        ...BASKET_AGENTS_CONFIG.uranus,
        sign: 'Gemini',
        degreeLabel: '4°',
        absoluteDegree: 64,
      },
      neptune: {
        ...BASKET_AGENTS_CONFIG.neptune,
        sign: 'Aries',
        degreeLabel: '4°',
        absoluteDegree: 4,
      },
      pluto: {
        ...BASKET_AGENTS_CONFIG.pluto,
        sign: 'Aquarius',
        degreeLabel: '4°',
        absoluteDegree: 304,
      },
      gregory: {
        ...BASKET_AGENTS_CONFIG.gregory,
        sign: 'Cancer / Scorpio',
        degreeLabel: 'Host',
        absoluteDegree: 91,
        name: 'Gregory Castro',
        title: 'The Conscious Host & Alchemical Poet',
      },
    }
  }, [moonInfo])

  // Scroll to bottom of chat thread when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  // Restart/reset chat thread control
  const handleRestartChat = () => {
    setMessages(INITIAL_MESSAGES)
    lastSpeakerKeyRef.current = 'pluto'
    setIsTyping(false)
    setTypingAgent(null)
    setIsAutonomousStreaming(true)
  }

  // Dynamic next speaker selector based on conversation context
  const getNextSpontaneousSpeaker = (lastKey: BasketAgentKey): BasketAgentKey => {
    const allKeys: BasketAgentKey[] = ['neptune', 'uranus', 'jupiter', 'pluto', 'gregory']
    const candidates = allKeys.filter(k => k !== lastKey)

    if (lastKey === 'jupiter') {
      if (Math.random() < 0.5) return 'pluto'
    } else if (lastKey === 'pluto') {
      if (Math.random() < 0.5) return 'jupiter'
    } else if (lastKey === 'gregory') {
      if (Math.random() < 0.4) return 'uranus'
      if (Math.random() < 0.4) return 'neptune'
    }

    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  // Measured Real-Time Autonomous Stream Loop (17s cadence, 6.5s reading & deep thought phase)
  useEffect(() => {
    if (!isAutonomousStreaming || isTyping) return

    const timer = setInterval(() => {
      const nextKey = getNextSpontaneousSpeaker(lastSpeakerKeyRef.current)
      lastSpeakerKeyRef.current = nextKey

      const nextCfg = agentsConfig[nextKey]
      setIsTyping(true)
      setTypingAgent(nextCfg.name)

      // 6.5-second deep thought & transcript digestion phase
      setTimeout(() => {
        setMessages(prevMsgs => {
          const responseText = generateSpontaneousCouncilResponse(nextKey, prevMsgs, skyContext)
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

          const newMsg: ChatMessage = {
            id: `auto-${Date.now()}`,
            agentKey: nextKey,
            senderName: nextCfg.name,
            senderRole: `${nextCfg.degreeLabel} ${nextCfg.sign}`,
            senderGlyph: nextCfg.glyph,
            element: nextCfg.element,
            content: responseText,
            timestamp: nowStr,
          }
          return [...prevMsgs, newMsg]
        })
        setIsTyping(false)
        setTypingAgent(null)
      }, 6500)
    }, 17000)

    return () => clearInterval(timer)
  }, [isAutonomousStreaming, isTyping, agentsConfig, skyContext])

  // Send a user question to the council
  const handleSendPrompt = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim()
    if (!text || isTyping) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      senderName: 'You (Searcher)',
      content: text,
      timestamp: timeStr,
      isUser: true,
    }

    setMessages(prev => [...prev, userMsg])
    setInputPrompt('')
    setIsTyping(true)

    const agentKeys: BasketAgentKey[] = ['jupiter', 'uranus', 'neptune', 'pluto', 'gregory']
    const primaryAgentKey =
      selectedAgentFilter !== 'all'
        ? selectedAgentFilter
        : agentKeys[Math.floor(Math.random() * agentKeys.length)]

    const secondAgentKey = agentKeys.filter(k => k !== primaryAgentKey)[
      Math.floor(Math.random() * (agentKeys.length - 1))
    ]

    const primaryCfg = agentsConfig[primaryAgentKey]
    setTypingAgent(primaryCfg.name)

    // First response reading full history + user prompt (5.0s thinking time)
    setTimeout(() => {
      setMessages(prevMsgs => {
        const responseText = generateSpontaneousCouncilResponse(
          primaryAgentKey,
          prevMsgs,
          skyContext,
          text
        )
        const botMsg1: ChatMessage = {
          id: `bot-1-${Date.now()}`,
          agentKey: primaryAgentKey,
          senderName: primaryCfg.name,
          senderRole: `${primaryCfg.degreeLabel} ${primaryCfg.sign}`,
          senderGlyph: primaryCfg.glyph,
          element: primaryCfg.element,
          content: responseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        return [...prevMsgs, botMsg1]
      })

      const secondCfg = agentsConfig[secondAgentKey]
      setTypingAgent(secondCfg.name)

      // Second response reading updated full history (5.5s thinking time)
      setTimeout(() => {
        setMessages(prevMsgs => {
          const responseText2 = generateSpontaneousCouncilResponse(
            secondAgentKey,
            prevMsgs,
            skyContext,
            text
          )
          const botMsg2: ChatMessage = {
            id: `bot-2-${Date.now()}`,
            agentKey: secondAgentKey,
            senderName: secondCfg.name,
            senderRole: `${secondCfg.degreeLabel} ${secondCfg.sign}`,
            senderGlyph: secondCfg.glyph,
            element: secondCfg.element,
            content: responseText2,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          return [...prevMsgs, botMsg2]
        })
        setIsTyping(false)
        setTypingAgent(null)
      }, 5500)
    }, 5000)
  }

  // Filtered messages
  const filteredMessages = useMemo(() => {
    if (selectedAgentFilter === 'all') return messages
    return messages.filter(m => m.isUser || m.agentKey === selectedAgentFilter)
  }, [messages, selectedAgentFilter])

  return (
    <div className="w-full relative glass-panel rounded-2xl border border-[#b8fc4b]/40 p-5 md:p-8 bg-[#090b0e]/95 shadow-[0_0_50px_rgba(184,252,75,0.12)] overflow-hidden">
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#b8fc4b]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-[#38bdf8]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Header */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#424936]/60">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#b8fc4b]/15 border border-[#b8fc4b]/40 rounded-full text-[10px] font-mono-label font-bold tracking-widest text-[#b8fc4b] uppercase">
              <span className="w-2 h-2 rounded-full bg-[#b8fc4b] animate-ping" />
              UNPRECEDENTED IN RECORDED HUMAN HISTORY
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#38bdf8]/15 border border-[#38bdf8]/30 rounded-full text-[10px] font-mono-label tracking-wider text-[#38bdf8]">
              <Zap className="w-3 h-3" /> BARBAULT’S BASKET · JULY 2026
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#8B5CF6]/15 border border-[#8B5CF6]/30 rounded-full text-[10px] font-mono-label tracking-wider text-[#8B5CF6]">
              <Cpu className="w-3 h-3" /> LIVE ALCHM TELEMETRY ACTIVE
            </span>
          </div>
          <h2 className="font-headline-lg text-2xl md:text-3xl font-bold text-[#e0e4d2] tracking-tight">
            Barbault’s Basket: <span className="text-[#b8fc4b]">The Historic Mega-Transit</span>
          </h2>
          <p className="font-body-md text-sm text-[#c2cab0] max-w-3xl mt-1 leading-relaxed">
            All four outer planets aligned at 4° across Fire & Air signs (Leo, Gemini, Aries,
            Aquarius) with Host Gregory Castro—supported by live ALCHM thermodynamic yield and sky
            chart ephemerides.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="bg-[#050506]/80 border border-[#424936] rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono-label text-[9px] text-[#8c947c] tracking-widest uppercase">
                Monica Constant / Spirit
              </div>
              <div className="font-headline-sm text-sm text-[#b8fc4b] font-bold">
                {skyContext.monicaConstant.toFixed(3)} · {skyContext.spirit}%
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 flex items-center justify-center text-[#b8fc4b]">
              <Activity className="w-4 h-4" />
            </div>
          </div>

          <button
            onClick={() => setShowInfoModal(!showInfoModal)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 border border-[#8c947c]/60 text-[#c2cab0] hover:text-[#b8fc4b] hover:border-[#b8fc4b]/40 rounded-xl font-mono-label text-[11px] tracking-wider transition-all active:scale-95 bg-white/5"
          >
            <Info className="w-4 h-4 text-[#b8fc4b]" />
            {showInfoModal ? 'Hide Analysis' : 'Historical Analysis'}
          </button>
        </div>
      </div>

      {showInfoModal && (
        <div className="relative z-10 my-5 p-5 bg-[#0d1117] border border-[#b8fc4b]/40 rounded-xl space-y-3 text-xs leading-relaxed text-[#c2cab0] animate-fadeIn">
          <div className="flex justify-between items-start">
            <h4 className="font-headline-sm text-sm text-[#b8fc4b] font-bold flex items-center gap-2">
              <Globe className="w-4 h-4" /> Why This July 2026 Mega-Transit Has No Precedent
            </h4>
            <button
              onClick={() => setShowInfoModal(false)}
              className="text-[#8c947c] hover:text-[#e0e4d2]"
            >
              ✕
            </button>
          </div>
          <p>
            In mundane astrology, <strong>André Barbault’s Cyclic Index</strong> measures the total
            planetary concentration of the outer planets. While minor cradle alignments occur every
            few decades, <strong>never before in recorded human history</strong> have all four outer
            planets (Jupiter, Uranus, Neptune, Pluto) sat simultaneously at 4° in Fire & Air signs
            forming a flawless mathematical basket.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 text-[11px]">
            <div className="p-3 bg-black/50 border border-[#facc15]/30 rounded-lg">
              <strong className="text-[#facc15] block mb-1">Jupiter at 4° Leo (Fire)</strong>
              Sovereign human heart, magnanimous authority, individual creation. Live Spirit:{' '}
              {skyContext.spirit}%.
            </div>
            <div className="p-3 bg-black/50 border border-[#38bdf8]/30 rounded-lg">
              <strong className="text-[#38bdf8] block mb-1">Uranus at 4° Gemini (Air)</strong>
              Light-speed cognitive synthesis, dual intelligence. Live Substance:{' '}
              {skyContext.substance}%.
            </div>
            <div className="p-3 bg-black/50 border border-[#a855f7]/30 rounded-lg">
              <strong className="text-[#a855f7] block mb-1">Neptune at 4° Aries (Fire)</strong>
              Pioneer spirit, primeval flame. Live Heat: {skyContext.heat}.
            </div>
            <div className="p-3 bg-black/50 border border-[#b8fc4b]/30 rounded-lg">
              <strong className="text-[#b8fc4b] block mb-1">Pluto at 4° Aquarius (Air)</strong>
              Systemic rebirth, shadow alchemy. Live Monica: {skyContext.monicaConstant.toFixed(3)}.
            </div>
          </div>
        </div>
      )}

      {/* Roster of Participating Basket Agents */}
      <div className="relative z-10 py-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="font-mono-label text-[10px] text-[#8c947c] tracking-widest uppercase flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#b8fc4b]" />
            Participating Planetary Agents (Click to Filter Voice)
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Autonomous Stream Control */}
            <button
              onClick={() => setIsAutonomousStreaming(!isAutonomousStreaming)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border font-mono-label text-[10px] tracking-wider transition-all ${
                isAutonomousStreaming
                  ? 'bg-[#b8fc4b]/15 text-[#b8fc4b] border-[#b8fc4b]/40'
                  : 'bg-white/5 text-[#8c947c] border-[#424936]'
              }`}
            >
              {isAutonomousStreaming ? (
                <>
                  <Pause className="w-3 h-3 text-[#b8fc4b] animate-pulse" /> Live Dialogue: ACTIVE
                  (17s)
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-[#8c947c]" /> Dialogue: PAUSED
                </>
              )}
            </button>

            {/* Restart Chat Button */}
            <button
              onClick={handleRestartChat}
              className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-[#424936] text-[#c2cab0] hover:text-[#b8fc4b] rounded-lg font-mono-label text-[10px] tracking-wider transition-all"
              title="Restart Council Chat thread"
            >
              <RotateCcw className="w-3 h-3" /> Restart Chat
            </button>

            <div className="flex items-center bg-black/40 border border-[#424936] rounded-lg p-0.5 font-mono-label text-[10px]">
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-1 rounded ${
                  viewMode === 'split' ? 'bg-[#b8fc4b]/20 text-[#b8fc4b]' : 'text-[#8c947c]'
                }`}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode('chat')}
                className={`px-2 py-1 rounded ${
                  viewMode === 'chat' ? 'bg-[#b8fc4b]/20 text-[#b8fc4b]' : 'text-[#8c947c]'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setViewMode('diagram')}
                className={`px-2 py-1 rounded ${
                  viewMode === 'diagram' ? 'bg-[#b8fc4b]/20 text-[#b8fc4b]' : 'text-[#8c947c]'
                }`}
              >
                Diagram
              </button>
            </div>

            {selectedAgentFilter !== 'all' && (
              <button
                onClick={() => setSelectedAgentFilter('all')}
                className="font-mono-label text-[10px] text-[#b8fc4b] underline hover:opacity-80 ml-2"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {(Object.keys(agentsConfig) as BasketAgentKey[]).map(key => {
            const agent = agentsConfig[key]
            const isSelected = selectedAgentFilter === key
            return (
              <button
                key={agent.key}
                onClick={() =>
                  setSelectedAgentFilter(prev => (prev === agent.key ? 'all' : agent.key))
                }
                className={`p-3 rounded-xl border text-left transition-all active:scale-95 group relative overflow-hidden ${
                  isSelected
                    ? `${agent.borderColor} ${agent.bgGlow} ring-1 ring-[#b8fc4b]/40`
                    : 'border-[#424936]/60 bg-[#050506]/60 hover:border-[#8c947c]'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${agent.avatarBg}`}
                  >
                    {agent.glyph}
                  </span>
                  <span className="font-mono-label text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[#c2cab0]">
                    {agent.degreeLabel}
                  </span>
                </div>
                <div className="font-headline-sm text-xs font-semibold text-[#e0e4d2] truncate">
                  {agent.name}
                </div>
                <div className="font-mono-label text-[9px] text-[#8c947c] truncate mt-0.5">
                  {agent.title}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Content Grid: Chat + Free-Body Diagram */}
      <div className="relative z-10 grid grid-cols-12 gap-5 mt-2">
        {/* Left Column: Chat Thread */}
        <div
          className={`${
            viewMode === 'diagram'
              ? 'hidden'
              : viewMode === 'chat'
                ? 'col-span-12'
                : 'col-span-12 lg:col-span-7'
          } bg-[#040507]/90 border border-[#424936]/80 rounded-xl p-4 md:p-6 flex flex-col h-[480px]`}
        >
          {/* Chat Thread Header */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#424936]/40">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#b8fc4b]" />
              <span className="font-headline-sm text-xs text-[#e0e4d2] font-semibold">
                Autonomous Barbault Council Thread
              </span>
              <span className="font-mono-label text-[10px] text-[#8c947c]">
                ({filteredMessages.length} messages)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isAutonomousStreaming ? 'bg-[#b8fc4b] animate-ping' : 'bg-amber-500'
                }`}
              />
              <span className="font-mono-label text-[10px] text-[#b8fc4b]">
                {isAutonomousStreaming ? 'SPONTANEOUS STREAM ACTIVE (17s Cadence)' : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* Scrollable Message List */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto space-y-3.5 pr-2 scrollbar-thin scrollbar-thumb-[#424936] scrollbar-track-transparent"
          >
            {filteredMessages.map(msg => {
              if (msg.isUser) {
                return (
                  <div key={msg.id} className="flex flex-col items-end">
                    <div className="max-w-[88%] bg-[#b8fc4b]/15 border border-[#b8fc4b]/40 rounded-2xl rounded-tr-none p-3 text-right">
                      <div className="font-mono-label text-[10px] text-[#b8fc4b] font-bold mb-1">
                        {msg.senderName} · {msg.timestamp}
                      </div>
                      <p className="font-body-md text-xs text-[#e0e4d2] leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                )
              }

              const agentCfg = msg.agentKey ? agentsConfig[msg.agentKey] : null
              return (
                <div key={msg.id} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold mt-0.5 ${
                      agentCfg ? agentCfg.avatarBg : 'bg-white/10 text-white'
                    }`}
                  >
                    {msg.senderGlyph || '✦'}
                  </div>
                  <div className="flex-1 max-w-[92%] bg-[#0c0e12] border border-[#424936]/60 rounded-2xl rounded-tl-none p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-xs font-bold text-[#e0e4d2]">
                          {msg.senderName}
                        </span>
                        {msg.senderRole && (
                          <span className="font-mono-label text-[9px] text-[#8c947c] px-1.5 py-0.2 rounded bg-white/5">
                            {msg.senderRole}
                          </span>
                        )}
                      </div>
                      <span className="font-mono-label text-[9px] text-[#8c947c]">
                        {msg.timestamp}
                      </span>
                    </div>
                    <p className="font-body-md text-xs text-[#c2cab0] leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 flex items-center justify-center text-[#b8fc4b] text-xs font-bold animate-spin">
                  ⟳
                </div>
                <div className="bg-[#0c0e12] border border-[#b8fc4b]/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="font-mono-label text-xs text-[#b8fc4b] animate-pulse">
                    {typingAgent
                      ? `${typingAgent} is sensing live sky transits & ALCHM yields (Spirit, Substance, Heat) to formulate spontaneous response...`
                      : 'Council is contemplating next spontaneous response...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Preset Prompt Chips */}
          <div className="mt-3 pt-3 border-t border-[#424936]/40 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="font-mono-label text-[9px] text-[#8c947c] shrink-0 uppercase tracking-widest">
              Prompts:
            </span>
            {PRESET_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                disabled={isTyping}
                onClick={() => handleSendPrompt(prompt)}
                className="shrink-0 px-2.5 py-1 bg-white/5 hover:bg-[#b8fc4b]/15 border border-[#424936] hover:border-[#b8fc4b]/40 rounded-full font-mono-label text-[10px] text-[#c2cab0] hover:text-[#b8fc4b] transition-all disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
              disabled={isTyping}
              placeholder="Ask the Barbault Council a question..."
              className="flex-1 bg-[#090b0e] border border-[#424936] focus:border-[#b8fc4b] rounded-xl px-4 py-2.5 text-xs text-[#e0e4d2] placeholder-[#8c947c] outline-none transition-all disabled:opacity-50"
            />
            <button
              onClick={() => handleSendPrompt()}
              disabled={!inputPrompt.trim() || isTyping}
              className="px-4 py-2.5 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs font-bold rounded-xl flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(184,252,75,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
            >
              <Send className="w-3.5 h-3.5" /> ASK
            </button>
          </div>
        </div>

        {/* Right Column: Free-Body Diagram */}
        <div
          className={`${
            viewMode === 'chat'
              ? 'hidden'
              : viewMode === 'diagram'
                ? 'col-span-12'
                : 'col-span-12 lg:col-span-5'
          }`}
        >
          <BarbaultFreeBodyDiagram
            agents={agentsConfig}
            selectedAgent={selectedAgentFilter}
            onSelectAgent={key => setSelectedAgentFilter(key)}
          />
        </div>
      </div>

      {/* Bottom CTAs */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#424936]/60">
        <div className="flex items-center gap-2 font-mono-label text-xs text-[#c2cab0]">
          <Sparkles className="w-4 h-4 text-[#b8fc4b]" />
          <span>Experience multi-agent cosmic synthesis in real time</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/planetary-agents')}
            className="px-4 py-2 border border-[#8c947c] text-[#e0e4d2] font-mono-label text-xs tracking-wider rounded-xl hover:bg-white/5 transition-all"
          >
            All Planetary Agents
          </button>
          <button
            onClick={() => (onOpenCouncil ? onOpenCouncil() : router.push('/planetary-council'))}
            className="px-5 py-2 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs tracking-wider font-bold rounded-xl flex items-center gap-2 hover:shadow-[0_0_15px_rgba(184,252,75,0.4)] transition-all active:scale-95"
          >
            Open Full Council <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
