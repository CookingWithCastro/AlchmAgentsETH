'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Activity,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Users,
  Send,
} from 'lucide-react'
import type { PlanetaryPosition } from '@/hooks/usePlanetaryPositions'
import { unifiedAgentFactory } from '@/lib/unified-agent-factory'
import { getPlanetaryDignity, getSignElement } from '@/lib/astrological-data'
import type { Element } from '@/lib/agent-types'

type LivePlanetaryCouncilThreadProps = {
  positions: PlanetaryPosition[]
  loading?: boolean
  lastUpdated?: Date | null
  onOpenCouncil: () => void
  onRefresh?: () => void
}

type CouncilAgent = {
  planet: string
  sign: string
  degree: number
  glyph: string
  accent: string
  border: string
  glow: string
  callSign: string
}

type Aspect = {
  planetA: string
  planetB: string
  type: string
  angle: number
  orb: number
}

type ElementKey = 'fire' | 'earth' | 'air' | 'water'

const PLANET_ORDER = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
}

const PLANET_CALLSIGN: Record<string, string> = {
  Sun: 'SUN_PRIME',
  Moon: 'LUNAR_CORE',
  Mercury: 'MERCURY_RELAY',
  Venus: 'VENUS_HARMONIC',
  Mars: 'MARS_VECTOR',
  Jupiter: 'JUPITER_ORACLE',
  Saturn: 'SATURN_GATE',
}

const SIGN_ORDER = [
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

const SIGN_ELEMENT: Record<string, ElementKey> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

const ELEMENT_STYLE: Record<ElementKey, { accent: string; border: string; glow: string }> = {
  fire: {
    accent: 'text-element-fire',
    border: 'border-element-fire/40',
    glow: 'shadow-[0_0_14px_rgba(251,146,60,0.18)]',
  },
  earth: {
    accent: 'text-element-earth',
    border: 'border-element-earth/40',
    glow: 'shadow-[0_0_14px_rgba(74,222,128,0.18)]',
  },
  air: {
    accent: 'text-element-air',
    border: 'border-element-air/40',
    glow: 'shadow-[0_0_14px_rgba(250,204,21,0.18)]',
  },
  water: {
    accent: 'text-element-water',
    border: 'border-element-water/40',
    glow: 'shadow-[0_0_14px_rgba(96,165,250,0.18)]',
  },
}

const MAJOR_ASPECTS = [
  { type: 'Conjunction', glyph: '☌', angle: 0, orb: 8 },
  { type: 'Sextile', glyph: '✶', angle: 60, orb: 5 },
  { type: 'Square', glyph: '□', angle: 90, orb: 6 },
  { type: 'Trine', glyph: '△', angle: 120, orb: 6 },
  { type: 'Opposition', glyph: '☍', angle: 180, orb: 8 },
]

const PHASES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
]

const AGENT_LINES: Record<string, string> = {
  Sun: 'Hold the center. The council is not asking for speed; it is asking for coherence.',
  Moon: 'I speak softly from the edge of renewal. The signal is subtle, but it is not empty.',
  Mercury: 'Name the thing before you act on it. Language gives the pattern a body.',
  Venus: 'Harmony is not softness alone. It is the architecture that lets desire move cleanly.',
  Mars: 'The vector is awake. Give the force a worthy target before it spends itself.',
  Jupiter: 'Widen the frame. The useful answer is bigger than the first question.',
  Saturn: 'Keep the threshold intact. What enters the work must be able to endure it.',
}

const capitalize = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : value

function normalizeDegrees(degrees: number) {
  return ((degrees % 360) + 360) % 360
}

function absoluteLongitude(position: Pick<PlanetaryPosition, 'sign' | 'degree'>) {
  const sign = capitalize(position.sign || '')
  const signIndex = SIGN_ORDER.indexOf(sign)
  return normalizeDegrees((signIndex >= 0 ? signIndex * 30 : 0) + (position.degree || 0))
}

function angularDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function formatDegree(degree: number) {
  if (!Number.isFinite(degree)) return '0'
  return degree.toFixed(1).replace(/\.0$/, '')
}

function phaseName(phaseAngle: number) {
  const phaseIndex = Math.round(phaseAngle / 45) % 8
  return PHASES[phaseIndex] || 'Unknown'
}

function illuminationPercent(phaseAngle: number) {
  return Math.round(((1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2) * 100)
}

function buildAspects(positions: PlanetaryPosition[]): Aspect[] {
  const visiblePositions = positions.filter(position =>
    PLANET_ORDER.includes(capitalize(position.planet))
  )
  const aspects: Aspect[] = []

  for (let i = 0; i < visiblePositions.length; i++) {
    for (let j = i + 1; j < visiblePositions.length; j++) {
      const first = visiblePositions[i]
      const second = visiblePositions[j]
      const distance = angularDistance(absoluteLongitude(first), absoluteLongitude(second))
      const aspect = MAJOR_ASPECTS.find(
        candidate => Math.abs(distance - candidate.angle) <= candidate.orb
      )

      if (aspect) {
        aspects.push({
          planetA: capitalize(first.planet),
          planetB: capitalize(second.planet),
          type: aspect.type,
          angle: aspect.angle,
          orb: Math.abs(distance - aspect.angle),
        })
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb)
}

function buildAgent(position: PlanetaryPosition): CouncilAgent {
  const planet = capitalize(position.planet)
  const sign = position.sign ? capitalize(position.sign) : 'Aries'
  const element = SIGN_ELEMENT[sign] || 'air'
  const style = ELEMENT_STYLE[element]

  return {
    planet,
    sign,
    degree: typeof position.degree === 'number' ? position.degree : 0,
    glyph: PLANET_GLYPH[planet] || '✦',
    accent: style.accent,
    border: style.border,
    glow: style.glow,
    callSign: PLANET_CALLSIGN[planet] || `${planet.toUpperCase()}_NODE`,
  }
}

function summarizeDominantElement(positions: PlanetaryPosition[]): ElementKey | null {
  const scores: Record<ElementKey, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  positions.forEach(position => {
    const sign = capitalize(position.sign || '')
    const element = SIGN_ELEMENT[sign]
    if (element) scores[element] += 1
  })

  const [element, count] = Object.entries(scores).sort(([, a], [, b]) => b - a)[0]
  return count > 0 ? (element as ElementKey) : null
}

function aspectGlyph(aspect?: Aspect | null) {
  if (!aspect) return '—'
  const definition = MAJOR_ASPECTS.find(candidate => candidate.type === aspect.type)
  return `${PLANET_GLYPH[aspect.planetA] || aspect.planetA} ${definition?.glyph || aspect.type} ${
    PLANET_GLYPH[aspect.planetB] || aspect.planetB
  }`
}

type ThreadMessage = {
  id: string
  role: 'user' | 'agent'
  agentId?: string
  agentName: string
  agentColor?: string
  agentSymbol?: string
  content: string
  timestamp: Date
}

const PLANET_COLORS_LOCAL: Record<string, string> = {
  Sun: '#f59e0b',
  Moon: '#9ca3af',
  Mercury: '#f97316',
  Venus: '#ec4899',
  Mars: '#ef4444',
  Jupiter: '#8b5cf6',
  Saturn: '#4b5563',
}

export function LivePlanetaryCouncilThread({
  positions,
  loading = false,
  lastUpdated,
  onOpenCouncil,
  onRefresh,
}: LivePlanetaryCouncilThreadProps) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<ThreadMessage[]>([])
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)

  const council = useMemo(() => {
    const normalized = positions
      .filter(position => PLANET_ORDER.includes(capitalize(position.planet)))
      .map(buildAgent)

    const byPlanet = new Map(normalized.map(agent => [agent.planet, agent]))
    const aspects = buildAspects(positions)
    const strongestAspect = aspects[0]
    const aspectPlanets = aspects.flatMap(aspect => [aspect.planetA, aspect.planetB])
    const activeNames = Array.from(
      new Set(['Moon', ...aspectPlanets, 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'])
    )
      .map(planet => byPlanet.get(planet))
      .filter((agent): agent is CouncilAgent => Boolean(agent))
      .slice(0, 4)

    const sun = positions.find(position => position.planet.toLowerCase() === 'sun')
    const moon = positions.find(position => position.planet.toLowerCase() === 'moon')
    const phaseAngle =
      sun && moon ? normalizeDegrees(absoluteLongitude(moon) - absoluteLongitude(sun)) : null
    const phase = phaseAngle === null ? 'Phase unavailable' : phaseName(phaseAngle)
    const illumination = phaseAngle === null ? null : illuminationPercent(phaseAngle)
    const dominantElement = summarizeDominantElement(positions)
    const retrogrades = positions
      .filter(position => position.retrograde)
      .map(position => capitalize(position.planet))
      .filter(planet => PLANET_ORDER.includes(planet))

    return {
      activeAgents: activeNames,
      dominantElement,
      phase,
      illumination,
      strongestAspect,
      retrogrades,
    }
  }, [positions])

  const primaryAgent = council.activeAgents[0]
  const secondaryAgent = council.activeAgents.find(agent => agent.planet !== primaryAgent?.planet)
  const messageAgents = [primaryAgent, secondaryAgent].filter((agent): agent is CouncilAgent =>
    Boolean(agent)
  )
  const hasLiveData = council.activeAgents.length > 0
  const dominantElementLabel = council.dominantElement
    ? `${capitalize(council.dominantElement)} dominant`
    : 'Mixed signal'
  const updatedLabel = lastUpdated
    ? lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'syncing'

  const transitEvent = council.strongestAspect
    ? `${council.strongestAspect.planetA} ${council.strongestAspect.type.toLowerCase()} ${
        council.strongestAspect.planetB
      } tightened to ${council.strongestAspect.orb.toFixed(1)}° orb.`
    : 'The council is listening for the next angular handoff.'

  // Seeding effect
  useEffect(() => {
    if (messages.length === 0 && council.activeAgents.length > 0) {
      const activePlanets = council.activeAgents.slice(0, 2)
      const seeded = activePlanets.map((agent, index) => ({
        id: `seeded-${agent.planet}-${index}`,
        role: 'agent' as const,
        agentId: `planetary-${agent.planet.toLowerCase()}-${agent.sign.toLowerCase()}-${agent.degree}`,
        agentName: agent.planet,
        agentColor: PLANET_COLORS_LOCAL[agent.planet] || '#6b7280',
        agentSymbol: agent.glyph,
        content: AGENT_LINES[agent.planet] || 'The council signal is assembling.',
        timestamp: new Date(Date.now() - (2 - index) * 60000),
      }))
      setMessages(seeded)
    }
  }, [council.activeAgents, messages.length])

  // Refresh handler
  const handleRefresh = (event: React.MouseEvent) => {
    event.stopPropagation()
    setMessages([]) // Clear local messages to trigger re-seed
    onRefresh?.()
  }

  // Send message to council
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending || council.activeAgents.length === 0) return

    const userMessage: ThreadMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      agentName: 'You',
      content: inputText.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsSending(true)

    // Build the UnifiedAgent representations for the active planets
    const activeAgentsToChat = council.activeAgents.slice(0, 2).map(agent => {
      const config = {
        planet: agent.planet,
        sign: agent.sign,
        degree: agent.degree.toString(),
        dignity: getPlanetaryDignity(agent.planet, agent.sign),
        element: getSignElement(agent.sign) as Element,
        color: PLANET_COLORS_LOCAL[agent.planet] || '#6b7280',
        symbol: agent.glyph,
        liveSkySync: true,
      }
      return unifiedAgentFactory.createFromPlanetary(config)
    })

    try {
      const priorHistory = [...messages, userMessage]

      const response = await fetch('/api/unified-multi-agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agents: activeAgentsToChat,
          message: userMessage.content,
          context: {
            sessionHistory: priorHistory.map(m => ({
              role: m.role,
              content: m.content,
              agentId: m.agentId,
              agentName: m.agentName,
              timestamp: m.timestamp.toISOString(),
            })),
            enableMemoryPersistence: false,
            realtimeUpdates: false,
            variant: 'planetary',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Council response failed')
      }

      if (!response.body) throw new Error('No stream response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const block of lines) {
          const blockLines = block.split('\n')
          const eventLine = blockLines.find(l => l.startsWith('event: '))
          const dataLine = blockLines.find(l => l.startsWith('data: '))

          if (!eventLine || !dataLine) continue

          const event = eventLine.replace('event: ', '').trim()
          const dataStr = dataLine.replace('data: ', '').trim()

          try {
            const parsedData = JSON.parse(dataStr)

            if (event === 'agent_start') {
              const agentId = parsedData.agentId
              const agent = council.activeAgents.find(
                a =>
                  `planetary-${a.planet.toLowerCase()}-${a.sign.toLowerCase()}-${a.degree}` ===
                  agentId
              )

              setMessages(prev => [
                ...prev,
                {
                  id: `msg-${Date.now()}-${agentId}`,
                  role: 'agent',
                  agentId: agentId,
                  agentName: agent?.planet || 'Planetary Agent',
                  agentColor: agent ? PLANET_COLORS_LOCAL[agent.planet] : '#6b7280',
                  agentSymbol: agent?.glyph || '✦',
                  content: '',
                  timestamp: new Date(),
                },
              ])
            } else if (event === 'text') {
              setMessages(prev => {
                const newMessages = [...prev]
                for (let i = newMessages.length - 1; i >= 0; i--) {
                  if (newMessages[i].agentId === parsedData.agentId) {
                    newMessages[i] = {
                      ...newMessages[i],
                      content: newMessages[i].content + parsedData.text,
                    }
                    break
                  }
                }
                return newMessages
              })
            }
          } catch (e) {
            console.error('Failed to parse SSE line in landing council', e)
          }
        }
      }
    } catch (err) {
      console.error('Landing page council chat error:', err)
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'agent',
          agentName: 'The Council',
          content:
            'The celestial alignment is fluctuating, causing a brief connection dropout. Please try asking again.',
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <section className="glass-panel rounded-xl border-[#23262B] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="w-full p-5 text-left hover:bg-white/[0.025] transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="led-dot led-green" />
                <h3 className="font-headline-sm text-lg text-[#e0e4d2]">Live Planetary Council</h3>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#b8fc4b]/30 bg-[#b8fc4b]/10 px-2.5 py-1 font-mono-label text-[9px] uppercase tracking-widest text-[#b8fc4b]">
                <Activity className="h-3 w-3" />
                Live sky sync
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {(hasLiveData ? council.activeAgents : Array.from({ length: 4 }, () => null)).map(
                  (agent, index) => (
                    <div
                      key={agent?.planet || index}
                      className={`flex h-9 w-9 items-center justify-center rounded-full border bg-[#050506] font-headline-sm text-lg ${
                        agent
                          ? `${agent.border} ${agent.accent} ${agent.glow}`
                          : 'border-[#424936] text-[#8c947c]'
                      }`}
                    >
                      {agent?.glyph || '✦'}
                    </div>
                  )
                )}
              </div>
              <div className="min-w-0 border-l border-[#424936] pl-3">
                <p className="font-mono-label text-[10px] uppercase tracking-widest text-[#8c947c]">
                  Agents enter and leave as transits change
                </p>
                <p className="mt-1 truncate font-body-md text-sm text-[#c2cab0]">
                  {hasLiveData
                    ? `${dominantElementLabel} · ${council.phase} · ${aspectGlyph(
                        council.strongestAspect
                      )}`
                    : loading
                      ? 'Reading current council members...'
                      : 'Awaiting live sky data...'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:justify-end">
            <div className="hidden sm:block rounded-lg border border-[#424936]/70 bg-[#050506]/50 px-3 py-2 text-right">
              <div className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                Latest relay
              </div>
              <div className="mt-1 max-w-[320px] truncate font-body-md text-xs text-[#c2cab0]">
                {primaryAgent
                  ? `${primaryAgent.planet}: ${AGENT_LINES[primaryAgent.planet]}`
                  : 'Council thread booting...'}
              </div>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#7bd1fa]/30 text-[#7bd1fa]">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[#23262B]">
          <div className="border-b border-[#23262B] bg-[#050506]/45 p-4">
            <div className="flex flex-wrap gap-2">
              {council.activeAgents.map(agent => (
                <div
                  key={agent.planet}
                  className="flex items-center gap-2 rounded-lg border border-[#424936]/70 bg-[#0A0A0B]/70 px-3 py-2"
                >
                  <span className={`${agent.accent} text-lg`}>{agent.glyph}</span>
                  <div>
                    <div className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                      {agent.planet}
                    </div>
                    <div className="font-mono-label text-[10px] text-[#e0e4d2]">
                      {agent.sign} {formatDegree(agent.degree)}°
                    </div>
                  </div>
                </div>
              ))}
              {!hasLiveData && (
                <div className="rounded-lg border border-[#424936]/70 bg-[#0A0A0B]/70 px-3 py-2 font-mono-label text-[10px] uppercase tracking-widest text-[#8c947c]">
                  Awaiting council lock
                </div>
              )}
            </div>
          </div>

          <div className="max-h-[430px] overflow-y-auto p-4">
            <div className="mb-4 flex justify-center">
              <span className="rounded-full border border-[#7bd1fa]/20 bg-[#7bd1fa]/5 px-3 py-1 font-mono-label text-[10px] text-[#7bd1fa]">
                {council.illumination === null
                  ? 'The Moon enters the thread.'
                  : `The Moon enters the thread: ${council.phase}, ${council.illumination}% illuminated.`}
              </span>
            </div>

            <div className="space-y-4">
              {messages.map(message => {
                const side = message.role === 'user'
                const color = message.agentColor || '#6b7280'
                const displayGlyph = message.agentSymbol || '✦'
                return (
                  <div
                    key={message.id}
                    className={`flex max-w-[92%] gap-3 ${side ? 'ml-auto flex-row-reverse text-right' : ''}`}
                  >
                    {message.role === 'agent' && (
                      <div
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-[#050506] text-xl border-[#424936]"
                        style={{
                          borderColor: color + '50',
                          color: color,
                          boxShadow: `0 0 10px ${color}15`,
                        }}
                      >
                        {displayGlyph}
                      </div>
                    )}
                    <div className="min-w-0 space-y-1">
                      <div className={`flex items-baseline gap-2 ${side ? 'justify-end' : ''}`}>
                        <span
                          className="font-mono-label text-[10px]"
                          style={{ color: side ? '#b8fc4b' : color }}
                        >
                          {side ? 'YOU' : `${message.agentName.toUpperCase()}_NODE`}
                        </span>
                        <span className="font-mono-label text-[9px] text-[#8c947c]">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-lg border p-3 ${
                          side
                            ? 'border-[#b8fc4b]/30 bg-[#b8fc4b]/5 text-[#c2cab0]'
                            : 'border-[#424936]/70 bg-[#050506]/80 text-[#e0e4d2]'
                        }`}
                      >
                        <p className="font-body-md text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content || '…'}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {isSending && (
                <div className="flex gap-2 items-center text-xs font-mono text-[#7bd1fa] ml-3 animate-pulse">
                  <Activity className="h-3 w-3 animate-spin" />
                  <span>Council is synthesizing responses...</span>
                </div>
              )}

              <div className="flex justify-center">
                <span className="rounded-full border border-[#b8fc4b]/20 bg-[#b8fc4b]/5 px-3 py-1 font-mono-label text-[10px] text-[#b8fc4b]">
                  Transit shift: {transitEvent}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#23262B] bg-[#050506]/70 p-4">
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <Metric
                label="Lunar"
                value={council.illumination === null ? '—' : `${council.illumination}% illum`}
              />
              <Metric
                label="Element"
                value={council.dominantElement ? `${capitalize(council.dominantElement)} dom` : '—'}
              />
              <Metric
                label="Retrograde"
                value={council.retrogrades.length ? council.retrogrades.join(', ') : 'None'}
                tone={council.retrogrades.length ? 'warning' : 'default'}
              />
              <Metric label="Aspect" value={aspectGlyph(council.strongestAspect)} />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#7bd1fa]/40 px-3 py-2 font-mono-label text-[10px] uppercase tracking-widest text-[#7bd1fa] hover:bg-[#7bd1fa]/10 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
              <form onSubmit={handleSend} className="relative flex-1 flex gap-2">
                <input
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  disabled={isSending || council.activeAgents.length === 0}
                  className="h-9 w-full rounded-lg border border-[#424936] bg-[#050506] px-3 pr-9 font-body-md text-sm text-[#e0e4d2] placeholder:text-[#8c947c] focus:outline-none focus:border-[#7bd1fa]/50 transition-colors"
                  placeholder={
                    council.activeAgents.length > 0
                      ? 'Ask the Council...'
                      : 'Waiting for council...'
                  }
                />
                <button
                  type="submit"
                  disabled={isSending || !inputText.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7bd1fa] hover:text-[#7bd1fa]/80 disabled:text-[#8c947c]/50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
              <button
                type="button"
                onClick={event => {
                  event.stopPropagation()
                  onOpenCouncil()
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#7bd1fa] px-4 py-2 font-mono-label text-[10px] font-bold uppercase tracking-widest text-[#001e2b] hover:shadow-[0_0_15px_rgba(125,211,252,0.35)] transition-all active:scale-95"
              >
                <Users className="h-3.5 w-3.5" />
                Open Full Council
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'warning'
}) {
  return (
    <div className="rounded-lg border border-[#424936]/70 bg-[#0A0A0B]/70 px-3 py-2">
      <div className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
        {label}
      </div>
      <div
        className={`mt-1 truncate font-mono-label text-[10px] ${
          tone === 'warning' ? 'text-[#ffb4ab]' : 'text-[#e0e4d2]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
