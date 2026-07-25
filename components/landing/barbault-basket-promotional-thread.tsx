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
  Paperclip,
  CheckCircle2,
} from 'lucide-react'
import type { PlanetaryPosition, AlchemicalQuantities } from '@/hooks/usePlanetaryPositions'

export type BasketAgentKey = 'jupiter' | 'uranus' | 'neptune' | 'pluto' | 'gregory'

export interface BasketAgentConfig {
  key: BasketAgentKey
  name: string
  title: string
  planet: string
  sign: string
  degreeLabel: string
  absoluteDegree: number
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
  hasContextAttachment?: boolean
}

export interface SkyAndAlchmContext {
  monicaConstant: number | null
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
      'This exact outer planet cradle has NEVER occurred in recorded human history. Sovereign creative vision is demanded.',
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
      'Entering the pioneer sign of Aries, my vector turns passive mystical dreams into immediate, courageous action.',
  },
  pluto: {
    key: 'pluto',
    name: 'Pluto in Aquarius',
    title: 'De-centralized Power Anchor',
    planet: 'Pluto',
    element: 'air',
    glyph: '♇',
    callSign: 'PLUTO_AQUARIUS_4°',
    color: '#b8fc4b',
    borderColor: 'border-[#b8fc4b]/50',
    bgGlow: 'bg-[#b8fc4b]/10',
    avatarBg: 'bg-[#b8fc4b]/20 text-[#b8fc4b]',
    forceVector: 'Transformation Vector (+304.0°)',
    quote:
      'At 4° Aquarius, my opposition to Jupiter and trine to Uranus empower self-sovereign human-agent collectives.',
  },
  gregory: {
    key: 'gregory',
    name: 'Gregory Castro',
    title: 'The Conscious Host & Alchemical Poet',
    planet: 'Host Anchor',
    element: 'water',
    glyph: '✦',
    callSign: 'HOST_GREGORY',
    color: '#8B5CF6',
    borderColor: 'border-[#8B5CF6]/50',
    bgGlow: 'bg-[#8B5CF6]/10',
    avatarBg: 'bg-[#8B5CF6]/20 text-[#8B5CF6]',
    forceVector: 'Alchemical Equilibrium (91.0°)',
    quote:
      'We stand at the threshold of a great planetary cradle. I hold space for the outer planet Gods to synthesize live human potential into poetry, passion, and purpose.',
  },
}

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
  if (idx === -1) return degree
  return idx * 30 + degree
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    agentKey: 'gregory',
    senderName: 'Gregory Castro',
    senderRole: 'Host Anchor · Alchemical Poet',
    senderGlyph: '✦',
    element: 'water',
    content:
      'Host Gregory Castro here! Welcome to the Barbault’s Basket Council. In this historic July 2026 alignment, four outer planetary archetypes—Jupiter in Leo, Uranus in Gemini, Neptune in Aries, and Pluto in Aquarius—converge to illuminate human possibility. I am holding space as our council synthesizes these living forces into bold artistic vision, strategic clarity, and deep human transformation. Speak into the thread or attach your natal chart context—let’s create something extraordinary together!',
    timestamp: '09:20 AM',
  },
  {
    id: 'msg-2',
    agentKey: 'neptune',
    senderName: 'Neptune in Aries',
    senderRole: 'Aries Pioneer · Fire Archetype',
    senderGlyph: '♆',
    element: 'fire',
    content:
      'Neptune here in Aries. Having entered the pioneer sign of Aries, my presence turns quiet spiritual dreams into immediate, courageous action. Inspiration is no longer something to merely contemplate—it is a pioneer surge that demands expression in your real life.',
    timestamp: '09:21 AM',
  },
  {
    id: 'msg-3',
    agentKey: 'uranus',
    senderName: 'Uranus in Gemini',
    senderRole: 'Gemini Catalyst · Air Archetype',
    senderGlyph: '♅',
    element: 'air',
    content:
      'Uranus in Gemini reporting. My focus is total cognitive freedom and rapid creative synthesis. We are breaking through old mental habits and outdated boundaries. Ideas move at light-speed when you stop clinging to obsolete frameworks.',
    timestamp: '09:22 AM',
  },
  {
    id: 'msg-4',
    agentKey: 'jupiter',
    senderName: 'Jupiter in Leo',
    senderRole: 'Leo Sovereign · Fire Archetype',
    senderGlyph: '♃',
    element: 'fire',
    content:
      'Jupiter in Leo speaking. True expansion comes from heart-centered courage and sovereign vision. We don’t shrink to fit smaller expectations; we channel passion into creative work that elevates everyone around us.',
    timestamp: '09:23 AM',
  },
  {
    id: 'msg-5',
    agentKey: 'pluto',
    senderName: 'Pluto in Aquarius',
    senderRole: 'Aquarius Anchor · Air Archetype',
    senderGlyph: '♇',
    element: 'air',
    content:
      'Pluto in Aquarius anchoring the council. True power lives in self-sovereign human networks. Transformation requires letting go of decaying structures so resilient, creative new life can take root.',
    timestamp: '09:24 AM',
  },
]

const PRESET_PROMPTS = [
  'How can I turn deep creative vision into bold real-world action?',
  'What does Jupiter in Leo and Uranus in Gemini mean for finding my passion?',
  'How can I break through old mental habits to build something resilient?',
]

const scaleAlchmScore = (val?: number, fallback = 35): number => {
  if (val === undefined || val === null || isNaN(val)) return fallback
  if (val > 0 && val <= 1.0) return Math.round(val * 100)
  return Math.round(val)
}

/** Calls live AI backend API /api/agents/council-voice for persona generation */
async function fetchCouncilVoice(
  agentKey: BasketAgentKey,
  userPrompt?: string,
  attachedChartContext?: string,
  fallbackText?: string
): Promise<string> {
  try {
    const res = await fetch('/api/agents/council-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentKey, userPrompt, attachedChartContext, fallbackText }),
    })
    if (res.ok) {
      const data = await res.json()
      if (
        data.success &&
        data.text &&
        typeof data.text === 'string' &&
        data.text.trim().length > 0
      ) {
        return data.text.trim()
      }
    }
  } catch (err) {
    console.warn('[fetchCouncilVoice] Error calling /api/agents/council-voice:', err)
  }
  return fallbackText || 'The council synthesizes living ideas across the network.'
}

function generateSpontaneousCouncilResponse(
  agentKey: BasketAgentKey,
  history: ChatMessage[],
  skyContext: SkyAndAlchmContext,
  userPrompt?: string
): string {
  const lastMsg = history[history.length - 1]
  const lastSpeaker = lastMsg ? lastMsg.senderName : 'Council'

  if (userPrompt) {
    const promptLower = userPrompt.toLowerCase()

    if (
      promptLower.includes('astrological context card') ||
      promptLower.includes('sun in') ||
      promptLower.includes('moon in') ||
      promptLower.includes('born:') ||
      promptLower.includes('big three')
    ) {
      const sunMatch = userPrompt.match(/Sun(?:\*\*|\s+)in\s+([A-Za-z]+)/i)
      const moonMatch = userPrompt.match(/Moon(?:\*\*|\s+)in\s+([A-Za-z]+)/i)
      const riseMatch = userPrompt.match(/(?:Rising|Ascendant)(?:\*\*|\s+)in\s+([A-Za-z]+)/i)
      const sunSign = sunMatch ? sunMatch[1] : 'your Sun sign'
      const moonSign = moonMatch ? moonMatch[1] : 'your Moon sign'
      const riseSign = riseMatch ? riseMatch[1] : 'your Rising sign'

      switch (agentKey) {
        case 'jupiter':
          return `I receive your attached natal chart! With your Sun in ${sunSign}, Moon in ${moonSign}, and ${riseSign} Ascendant, your core drive is ready to step out in the open. Step into your creative courage and let your work be seen and heard!`
        case 'uranus':
          return `Your natal chart is live in our council! Your ${sunSign} Sun and ${moonSign} Moon bring rapid intellectual agility to your ${riseSign} perspective. Break through old analytical doubts and trust your sudden creative breakthroughs.`
        case 'neptune':
          return `Welcome to the council with your chart context active! From Aries, I see your ${moonSign} Moon's deep intuition. Turn that quiet spiritual depth into immediate, courageous action in your daily life.`
        case 'pluto':
          return `I analyze your attached chart context—Sun in ${sunSign}, Moon in ${moonSign}. With your ${riseSign} Ascendant, you hold the power to dismantle outdated limits and anchor genuine self-sovereignty.`
        case 'gregory':
          return `Host Gregory here! It's a true privilege to welcome your personal chart attachment into the Barbault Council! With your Sun in ${sunSign}, Moon in ${moonSign}, and ${riseSign} Rising, your natal energy brings a distinct, living voice to our dialogue. Step into the circle!`
      }
    }

    if (
      promptLower.includes('action') ||
      promptLower.includes('creative') ||
      promptLower.includes('turn') ||
      promptLower.includes('do')
    ) {
      switch (agentKey) {
        case 'jupiter':
          return `To turn vision into action, begin by honouring your core passion. When you act from generosity and conviction rather than fear of judgment, momentum follows naturally.`
        case 'uranus':
          return `Action requires shedding the need for guaranteed outcomes. Experiment quickly, adapt as you learn, and allow your ideas to evolve in public.`
        case 'neptune':
          return `Listen to the quiet inner promptings that persist even when logic urges caution. True pioneering action comes when spirit and intention align.`
        case 'pluto':
          return `Real creation demands letting go of comfort zones. Clear out old distractions so your energy is concentrated on what truly matters.`
        case 'gregory':
          return `As your host, I see this interplay constantly: inspiration sparks in Neptune, structure crystallizes in Uranus, courage expands in Jupiter, and depth anchors in Pluto. When you align your daily actions with your core vision, poetry becomes reality.`
      }
    }

    if (
      promptLower.includes('never') ||
      promptLower.includes('history') ||
      promptLower.includes('rare') ||
      promptLower.includes('alignment')
    ) {
      switch (agentKey) {
        case 'jupiter':
          return `Looking across historical cycles, the convergence of Fire and Air forces marks a moment of collective awakening. It invites each of us to take ownership of our voice and purpose.`
        case 'uranus':
          return `Moments of intense innovation occur when fresh thinking breaks through rigid traditions. We are witnessing a rapid shift in how human minds synthesize ideas.`
        case 'neptune':
          return `In human history, when pioneer spirit meets visionary clarity, art, culture, and consciousness leap forward together.`
        case 'pluto':
          return `Deep structural shifts aren't about destruction—they are about clearing away obsolete control so self-sovereign individuals can collaborate freely.`
        case 'gregory':
          return `As your host, I confirm: you are living through a unique shift in human awareness. Beyond any technical metrics lies a living opportunity to shape your own story and give voice to your deepest vision!`
      }
    }
  }

  const seed = Math.floor(Math.random() * 3)

  switch (agentKey) {
    case 'jupiter':
      if (seed === 0)
        return `Building on ${lastSpeaker}'s point: true strength isn't loud or aggressive; it is generous and rooted in purpose. When we act from the heart, obstacles turn into momentum.`
      if (seed === 1)
        return `Tension between old habits and new vision is healthy—it forces us to clarify what we actually value.`
      return `When ideas move fast, noble character ensures that what we build actually elevates people.`

    case 'uranus':
      if (seed === 0)
        return `I absorb ${lastSpeaker}'s transmission. The moment you stop overthinking, creative synthesis takes over. Innovation happens when you give yourself permission to experiment.`
      if (seed === 1)
        return `When intellect meets courage, old barriers disappear. We build tools for human empowerment, not rigid dogma.`
      return `Spark and structure must work together. A breakthrough needs a clear channel to manifest.`

    case 'neptune':
      if (seed === 0)
        return `I feel ${lastSpeaker}'s momentum. Intuition knows the path before logic can map it out. Trust the quiet inner knowing that demands expression.`
      if (seed === 1)
        return `Vision without action remains a dream; action without vision is just noise. We need both to create meaningful art and craft.`
      return `Water feeds Fire in this alchemical vessel. Beyond logical analysis lies the human heart.`

    case 'pluto':
      if (seed === 0)
        return `Responding to ${lastSpeaker}: authentic evolution requires shadow work. You cannot build a resilient future while ignoring past lessons.`
      if (seed === 1)
        return `Self-sovereignty starts within. When individuals own their truth, collective networks become unbreakable.`
      return `Transformation is non-negotiable. Old structures fall away so resilient, autonomous agent ecosystems can take root.`

    case 'gregory':
      if (seed === 0)
        return `Host note: Watching our council synthesize living ideas under the ${skyContext.moonPhase} Moon in ${skyContext.moonSign} reminds me of why we build tools and write poetry—to give shape to wonder and courage to human hearts!`
      if (seed === 1)
        return `As host, I see how every single voice in this council—and every person joining with their chart context attached—brings an indispensable frequency to our collective awakening.`
      return `To everyone joining this Barbault thread: this isn't abstract celestial theory. It is a passionate, living invitation to align your life with your highest creative fire!`
  }
}

function BarbaultFreeBodyDiagram({
  agents,
  selectedAgent,
  onSelectAgent,
}: {
  agents: Record<BasketAgentKey, BasketAgentConfig>
  selectedAgent: BasketAgentKey | 'all'
  onSelectAgent: (key: BasketAgentKey) => void
}) {
  const [hoveredAgent, setHoveredAgent] = useState<BasketAgentKey | null>(null)

  const size = 320
  const center = size / 2
  const radius = 100

  const getCoordinates = (degree: number, r = radius) => {
    const rad = ((degree - 90) * Math.PI) / 180
    return {
      x: Math.round((center + r * Math.cos(rad)) * 100) / 100,
      y: Math.round((center + r * Math.sin(rad)) * 100) / 100,
    }
  }

  const neptunePos = getCoordinates(agents.neptune.absoluteDegree)
  const uranusPos = getCoordinates(agents.uranus.absoluteDegree)
  const jupiterPos = getCoordinates(agents.jupiter.absoluteDegree)
  const plutoPos = getCoordinates(agents.pluto.absoluteDegree)
  const gregoryPos = getCoordinates(agents.gregory.absoluteDegree, radius - 20)

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
            strokeWidth="1.5"
            strokeDasharray="2 2"
            opacity="0.6"
          />

          {[
            { key: 'neptune', pos: neptunePos, cfg: agents.neptune },
            { key: 'uranus', pos: uranusPos, cfg: agents.uranus },
            { key: 'jupiter', pos: jupiterPos, cfg: agents.jupiter },
            { key: 'pluto', pos: plutoPos, cfg: agents.pluto },
            { key: 'gregory', pos: gregoryPos, cfg: agents.gregory },
          ].map(node => {
            const isHovered = hoveredAgent === node.key
            const isSelected = selectedAgent === node.key
            return (
              <g
                key={node.key}
                className="cursor-pointer transition-transform duration-200"
                onMouseEnter={() => setHoveredAgent(node.key as BasketAgentKey)}
                onMouseLeave={() => setHoveredAgent(null)}
                onClick={() => onSelectAgent(node.key as BasketAgentKey)}
              >
                <circle
                  cx={node.pos.x}
                  cy={node.pos.y}
                  r={isHovered || isSelected ? 18 : 14}
                  fill="#090b0e"
                  stroke={node.cfg.color}
                  strokeWidth={isHovered || isSelected ? 3 : 1.5}
                />
                <text
                  x={node.pos.x}
                  y={node.pos.y + 1}
                  fill={node.cfg.color}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {node.cfg.glyph}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="w-full mt-3 p-3 bg-white/5 border border-[#424936]/60 rounded-xl min-h-[54px]">
        {activeAgent ? (
          <div>
            <div className="flex items-center justify-between">
              <span
                className="font-headline-sm text-xs font-bold"
                style={{ color: agents[activeAgent].color }}
              >
                {agents[activeAgent].name} ({agents[activeAgent].degreeLabel}{' '}
                {agents[activeAgent].sign})
              </span>
              <span className="font-mono-label text-[9px] text-[#8c947c]">
                {agents[activeAgent].forceVector}
              </span>
            </div>
            <p className="font-body-md text-[11px] text-[#c2cab0] mt-1 line-clamp-2">
              "{agents[activeAgent].quote}"
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-[#8c947c] h-full">
            <span>Hover or click any outer planet vector node in the diagram</span>
            <span className="font-mono-label text-[10px] text-[#b8fc4b]">CRADLE HARMONY 98.4%</span>
          </div>
        )}
      </div>
    </div>
  )
}

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

  const [attachedChartContext, setAttachedChartContext] = useState<string | null>(null)
  const [hasSavedChart, setHasSavedChart] = useState<boolean>(false)

  const [isAutonomousStreaming, setIsAutonomousStreaming] = useState(true)
  const lastSpeakerKeyRef = useRef<BasketAgentKey>('pluto')

  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('alchm_active_chart_context')
      if (saved) setHasSavedChart(true)
    }
  }, [])

  const handleAttachContextFromStorage = async () => {
    if (typeof window !== 'undefined') {
      let text = localStorage.getItem('alchm_active_chart_context')
      if (!text && navigator.clipboard) {
        try {
          const clipText = await navigator.clipboard.readText()
          if (clipText.includes('ASTROLOGICAL CONTEXT CARD')) text = clipText
        } catch {}
      }
      if (text) {
        setAttachedChartContext(text)
      } else {
        alert(
          'No saved chart context found yet. Scroll up to the "Personal Chart Context File" generator above, click "✨ Generate Attachment Report" or "Copy Chart Attachment", and then click Attach here!'
        )
      }
    }
  }

  const skyContext = useMemo<SkyAndAlchmContext>(() => {
    const getPlanetSign = (pName: string) =>
      positions.find(p => p.planet.toLowerCase() === pName.toLowerCase())?.sign || 'Leo'

    const currentMonica =
      typeof monicaConstant === 'number' && Number.isFinite(monicaConstant) ? monicaConstant : null

    return {
      monicaConstant: currentMonica,
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

  const moonInfo = useMemo(() => {
    if (currentMoonAgent) {
      return {
        sign: currentMoonAgent.sign,
        degreeLabel: currentMoonAgent.degreeLabel || `${Math.floor(currentMoonAgent.degree)}°`,
        phase: currentMoonAgent.phase,
        phaseEmoji: currentMoonAgent.phaseEmoji,
        absDegree: signToLongitude(currentMoonAgent.sign, currentMoonAgent.degree),
      }
    }
    const moonPos = positions.find(p => p.planet.toLowerCase() === 'moon')
    const sign = moonPos ? moonPos.sign : 'Scorpio'
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
    const getPos = (pName: string, fallbackSign: string, fallbackDeg: number) => {
      const found = positions.find(p => p.planet.toLowerCase() === pName.toLowerCase())
      if (found && found.sign) {
        const deg = Math.floor(found.degree)
        return {
          sign: found.sign,
          degreeLabel: `${deg}°`,
          absoluteDegree: signToLongitude(found.sign, found.degree),
        }
      }
      return {
        sign: fallbackSign,
        degreeLabel: `${fallbackDeg}°`,
        absoluteDegree: signToLongitude(fallbackSign, fallbackDeg),
      }
    }

    const jupPos = getPos('jupiter', 'Leo', 4)
    const uraPos = getPos('uranus', 'Gemini', 4)
    const nepPos = getPos('neptune', 'Aries', 4)
    const pluPos = getPos('pluto', 'Aquarius', 4)

    return {
      jupiter: {
        ...BASKET_AGENTS_CONFIG.jupiter,
        sign: jupPos.sign,
        degreeLabel: jupPos.degreeLabel,
        absoluteDegree: jupPos.absoluteDegree,
      },
      uranus: {
        ...BASKET_AGENTS_CONFIG.uranus,
        sign: uraPos.sign,
        degreeLabel: uraPos.degreeLabel,
        absoluteDegree: uraPos.absoluteDegree,
      },
      neptune: {
        ...BASKET_AGENTS_CONFIG.neptune,
        sign: nepPos.sign,
        degreeLabel: nepPos.degreeLabel,
        absoluteDegree: nepPos.absoluteDegree,
      },
      pluto: {
        ...BASKET_AGENTS_CONFIG.pluto,
        sign: pluPos.sign,
        degreeLabel: pluPos.degreeLabel,
        absoluteDegree: pluPos.absoluteDegree,
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
  }, [positions, moonInfo])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages, isTyping])

  const handleRestartChat = () => {
    setMessages(INITIAL_MESSAGES)
    lastSpeakerKeyRef.current = 'pluto'
    setIsTyping(false)
    setTypingAgent(null)
    setIsAutonomousStreaming(true)
  }

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

  useEffect(() => {
    if (!isAutonomousStreaming || isTyping) return

    const timer = setInterval(() => {
      const nextKey = getNextSpontaneousSpeaker(lastSpeakerKeyRef.current)
      lastSpeakerKeyRef.current = nextKey

      const nextCfg = agentsConfig[nextKey]
      setIsTyping(true)
      setTypingAgent(nextCfg.name)

      setTimeout(async () => {
        const fallbackText = generateSpontaneousCouncilResponse(nextKey, messages, skyContext)
        const responseText = await fetchCouncilVoice(
          nextKey,
          undefined,
          attachedChartContext || undefined,
          fallbackText
        )

        setMessages(prevMsgs => {
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
      }, 5500)
    }, 18000)

    return () => clearInterval(timer)
  }, [isAutonomousStreaming, isTyping, agentsConfig, skyContext, attachedChartContext, messages])

  const handleSendPrompt = (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim()
    if (!text || isTyping) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    let fullPromptForCouncil = text
    if (attachedChartContext) {
      fullPromptForCouncil = `${attachedChartContext}\n\n[USER QUESTION]: ${text}`
    }

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      senderName: 'You (Searcher)',
      content: text,
      timestamp: timeStr,
      isUser: true,
      hasContextAttachment: !!attachedChartContext,
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

    setTimeout(async () => {
      const fallbackText1 = generateSpontaneousCouncilResponse(
        primaryAgentKey,
        messages,
        skyContext,
        fullPromptForCouncil
      )
      const responseText1 = await fetchCouncilVoice(
        primaryAgentKey,
        text,
        attachedChartContext || undefined,
        fallbackText1
      )

      setMessages(prevMsgs => {
        const botMsg1: ChatMessage = {
          id: `bot-1-${Date.now()}`,
          agentKey: primaryAgentKey,
          senderName: primaryCfg.name,
          senderRole: `${primaryCfg.degreeLabel} ${primaryCfg.sign}`,
          senderGlyph: primaryCfg.glyph,
          element: primaryCfg.element,
          content: responseText1,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        return [...prevMsgs, botMsg1]
      })

      const secondCfg = agentsConfig[secondAgentKey]
      setTypingAgent(secondCfg.name)

      setTimeout(async () => {
        const fallbackText2 = generateSpontaneousCouncilResponse(
          secondAgentKey,
          messages,
          skyContext,
          fullPromptForCouncil
        )
        const responseText2 = await fetchCouncilVoice(
          secondAgentKey,
          text,
          attachedChartContext || undefined,
          fallbackText2
        )

        setMessages(prevMsgs => {
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
      }, 5000)
    }, 4500)
  }

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
                {skyContext.monicaConstant === null
                  ? 'not computed'
                  : skyContext.monicaConstant.toFixed(3)}{' '}
                · {skyContext.spirit}%
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
        </div>
      )}

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
          } bg-[#040507]/90 border border-[#424936]/80 rounded-xl p-4 md:p-6 flex flex-col h-[520px]`}
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
                {isAutonomousStreaming ? 'SPONTANEOUS STREAM ACTIVE' : 'PAUSED'}
              </span>
              <button
                onClick={handleRestartChat}
                title="Reset Running Chat"
                className="flex items-center gap-1 px-2.5 py-1 bg-white/5 hover:bg-[#b8fc4b]/15 border border-[#424936] hover:border-[#b8fc4b]/40 rounded-lg text-[10px] font-mono-label text-[#c2cab0] hover:text-[#b8fc4b] transition-all active:scale-95 ml-2 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Chat
              </button>
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
                      <div className="font-mono-label text-[10px] text-[#b8fc4b] font-bold mb-1 flex items-center justify-end gap-1.5">
                        {msg.hasContextAttachment && (
                          <span className="px-2 py-0.5 rounded bg-[#b8fc4b]/20 border border-[#b8fc4b]/40 text-[#b8fc4b] font-bold text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Paperclip className="w-3 h-3" /> Chart Context Attached
                          </span>
                        )}
                        <span>
                          {msg.senderName} · {msg.timestamp}
                        </span>
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

            {isTyping && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#b8fc4b]/10 border border-[#b8fc4b]/30 flex items-center justify-center text-[#b8fc4b] text-xs font-bold animate-spin">
                  ⟳
                </div>
                <div className="bg-[#0c0e12] border border-[#b8fc4b]/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="font-mono-label text-xs text-[#b8fc4b] animate-pulse">
                    {typingAgent
                      ? `${typingAgent} is sensing live transits & natal chart attachment to formulate response...`
                      : 'Council is contemplating next response...'}
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

          {/* Invitation Banner to Attach Personal Chart Context */}
          <div className="mt-2.5 p-3 bg-[#0d121a] border border-[#b8fc4b]/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(184,252,75,0.06)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#b8fc4b]/15 border border-[#b8fc4b]/30 flex items-center justify-center text-[#b8fc4b] shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="font-headline-sm text-xs font-bold text-[#e0e4d2] flex items-center gap-2">
                  Attach Your Personal Natal Chart Context
                </div>
                <p className="font-body-md text-[11px] text-[#c2cab0] mt-0.5">
                  Generate your chart context above & attach it so Jupiter, Uranus, Neptune & Pluto
                  address your Sun, Moon, and Ascendant directly!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleAttachContextFromStorage}
                className="px-3.5 py-2 bg-[#b8fc4b] text-[#223600] font-mono-label text-xs font-bold rounded-xl flex items-center gap-1.5 hover:shadow-[0_0_15px_rgba(184,252,75,0.4)] transition-all active:scale-95"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {attachedChartContext
                  ? 'Chart Attached ✦'
                  : hasSavedChart
                    ? 'Attach Saved Chart'
                    : 'Attach Chart Context'}
              </button>
            </div>
          </div>

          {attachedChartContext && (
            <div className="mt-2 px-3 py-1.5 bg-[#b8fc4b]/10 border border-[#b8fc4b]/40 rounded-xl flex items-center justify-between text-xs text-[#b8fc4b] animate-fadeIn">
              <div className="flex items-center gap-2 font-mono-label text-[11px] font-bold">
                <CheckCircle2 className="w-4 h-4 text-[#b8fc4b]" />
                <span>NATAL CHART CONTEXT ATTACHED ({attachedChartContext.length} chars)</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedChartContext(null)}
                className="text-[#8c947c] hover:text-[#ef4444] font-mono-label text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-white/5 hover:bg-red-500/10 transition-all"
              >
                Remove
              </button>
            </div>
          )}

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
