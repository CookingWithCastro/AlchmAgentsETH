'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Sparkles,
  Users,
  Clock,
  MessageSquare,
  Star,
  Zap,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { fetchCurrentPlanetaryPositions } from '@/lib/monica/fetch-current-positions'
import { degreeAgentMatcher } from '@/lib/degree-agent-matcher'
import { DEMO_AGENTS } from '@/lib/demo-agents-data'
import { ZodiacWheel } from '@/components/zodiac-wheel'
import { PlanetFBDCard } from '@/components/planet-fbd-card'
import { buildFBDFromWheelPositions, isDiurnal } from '@/lib/alchm-fbd/adapter'
import dynamic from 'next/dynamic'
import type { CraftedAgent } from '@/lib/agent-types'

const HistoricalCouncilChat = dynamic(() => import('@/components/misc/historical-council-chat'), {
  loading: () => (
    <div className="h-32 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
})

interface PlanetActivation {
  planet: string
  sign: string
  degree: number
  agents: Array<{ agent: CraftedAgent; activationStrength: number }>
}

export default function TransitsPage() {
  const [planetaryPositions, setPlanetaryPositions] = useState<any>(null)
  const [activations, setActivations] = useState<PlanetActivation[]>([])
  const [wheelTransits, setWheelTransits] = useState<
    Array<{ planet: string; longitude: number; sign: string }>
  >([])
  const [activatedAgentIds, setActivatedAgentIds] = useState<string[]>([])

  // Free-body diagrams for the current sky. Recomputed only when positions
  // change — the engine does a full aspect pass plus a three-layer ESMS
  // decomposition, which is wasted work on every unrelated re-render.
  const fbd = useMemo(
    () => buildFBDFromWheelPositions(wheelTransits, { diurnal: isDiurnal(new Date()) }),
    [wheelTransits]
  )
  // ESMS the ten cards don't carry (Ascendant grounding + the far half of any
  // aspect to a body without a card). Surfaced rather than hidden, so the grid
  // never implies "ten cards = the whole sky".
  const fbdOffCard = fbd
    ? fbd.totals.unattributed.Spirit +
      fbd.totals.unattributed.Essence +
      fbd.totals.unattributed.Matter +
      fbd.totals.unattributed.Substance
    : 0
  const [loading, setLoading] = useState(true)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadTransitsAndActivateAgents(true)
    // Refresh every 5 minutes — silently: no loading flash, no modal re-open
    const interval = setInterval(() => loadTransitsAndActivateAgents(false), 300000)
    return () => clearInterval(interval)
  }, [])

  const loadTransitsAndActivateAgents = async (initialLoad: boolean) => {
    try {
      if (initialLoad) setLoading(true)

      // Fetch current planetary positions
      const positions = await fetchCurrentPlanetaryPositions()
      setPlanetaryPositions(positions)

      if (!positions || !positions['Planet Positions']) {
        setLoading(false)
        return
      }

      // Build moment object for degree matching
      const planetPositions = positions['Planet Positions']
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

      const planetaryDegrees: Record<string, number> = {}
      const planetActivations: PlanetActivation[] = []
      const currentWheelTransits: Array<{ planet: string; longitude: number; sign: string }> = []

      Object.entries(planetPositions).forEach(([planet, data]: [string, any]) => {
        const signIndex = signs.indexOf(data.sign)
        if (signIndex >= 0) {
          const absoluteDegree = signIndex * 30 + data.degree
          planetaryDegrees[planet] = absoluteDegree

          currentWheelTransits.push({
            planet,
            longitude: absoluteDegree,
            sign: data.sign,
          })

          // Store for display
          planetActivations.push({
            planet,
            sign: data.sign,
            degree: data.degree,
            agents: [],
          })
        }
      })

      // Create moment object for degree matching
      const now = new Date()
      const moment: any = {
        timestamp: now,
        planetaryDegrees,
        alchemical: {
          A_number: (positions['Alchemy Effects'] as any)?.['A#'] || 2.0,
          spirit: positions['Alchemy Effects']?.['Total Spirit'] || 0.25,
          matter: positions['Alchemy Effects']?.['Total Matter'] || 0.25,
          essence: positions['Alchemy Effects']?.['Total Essence'] || 0.25,
          substance: positions['Alchemy Effects']?.['Total Substance'] || 0.25,
        },
        kinetic: {
          velocity: { Fire: 0, Water: 0, Air: 0, Earth: 0 },
          momentum: { Fire: 0, Water: 0, Air: 0, Earth: 0 },
          power: 0,
          inertia: 0,
          metricVelocity: { Heat: 0, Entropy: 0, Reactivity: 0, Energy: 0 },
        },
        thermodynamic: { heat: 0, entropy: 0, reactivity: 0, energy: 0 },
        elemental: { Fire: 0.25, Water: 0.25, Air: 0.25, Earth: 0.25 },
        planetary: {
          dominantPlanet: 'Sun',
          dominantSign: 'Aries',
          moonPhase: 0,
          retrogradeCount: 0,
        },
        consciousness: {
          resonanceLevel: 0.1,
          evolutionPhase: 'Integration',
          spiritualAmplitude: 0.1,
        },
      }

      // Find agent activations
      const matchedActivations = await degreeAgentMatcher.findActivations(moment)

      // Update planet activations with matched agents
      matchedActivations.forEach(activation => {
        const planetActivation = planetActivations.find(p => p.planet === activation.planet)
        if (planetActivation && activation.activatedAgents.length > 0) {
          const agents = activation.activatedAgents.map(aa => ({
            agent: DEMO_AGENTS.find(a => a.id === aa.agentId)!,
            activationStrength: aa.resonanceStrength,
          }))
          planetActivation.agents = agents.filter(a => a.agent)
        }
      })

      // Collect all activated agent IDs (top 5 most activated)
      const allActivatedAgents = planetActivations
        .flatMap(p => p.agents)
        .sort((a, b) => b.activationStrength - a.activationStrength)
        .slice(0, 5)
        .map(a => a.agent.id)

      setActivations(planetActivations.filter(p => p.agents.length > 0))
      setWheelTransits(currentWheelTransits)
      setActivatedAgentIds([...new Set(allActivatedAgents)])
      setLastUpdate(new Date())

      // Auto-open group chat once, on first load — refreshes must not re-open
      // a modal the user dismissed.
      if (initialLoad && allActivatedAgents.length > 0) {
        setShowGroupChat(true)
      }
    } catch (error) {
      console.error('Error loading transits:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanetEmoji = (planet: string) => {
    const emojis: Record<string, string> = {
      Sun: '☉',
      Moon: '☽',
      Mercury: '☿',
      Venus: '♀',
      Mars: '♂',
      Jupiter: '♃',
      Saturn: '♄',
      Uranus: '♅',
      Neptune: '♆',
      Pluto: '♇',
    }
    return emojis[planet] || '⭐'
  }

  const activatedAgents = DEMO_AGENTS.filter(a => activatedAgentIds.includes(a.id))

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8 text-purple-500" />
            Current Transits - Agent Activation
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time planetary positions activating consciousness agents
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Updated {mounted ? lastUpdate.toLocaleTimeString() : ''}
          </Badge>
          {activatedAgentIds.length > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {activatedAgentIds.length} Agents Activated
            </Badge>
          )}
        </div>
      </div>

      {/* Current Cosmic Energies */}
      {planetaryPositions && (
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-950/50 dark:to-indigo-950/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500" />
              Current Cosmic Configuration
            </CardTitle>
            <CardDescription>
              Planetary positions at {mounted ? new Date().toLocaleString() : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {planetaryPositions['Alchemy Effects'] && (
                <>
                  <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
                    <div className="text-2xl font-bold text-purple-600">
                      {planetaryPositions['Alchemy Effects']['A#']?.toFixed(2) || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Alchemical Number</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
                    <div className="text-2xl font-bold text-red-600">
                      {planetaryPositions['Alchemy Effects']['Total Spirit']?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Spirit</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
                    <div className="text-2xl font-bold text-blue-600">
                      {planetaryPositions['Alchemy Effects']['Total Essence']?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Essence</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
                    <div className="text-2xl font-bold text-yellow-600">
                      {planetaryPositions['Alchemy Effects']['Total Matter']?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Matter</div>
                  </div>
                  <div className="text-center p-3 bg-white dark:bg-black/20 rounded-lg border">
                    <div className="text-2xl font-bold text-green-600">
                      {planetaryPositions['Alchemy Effects']['Total Substance']?.toFixed(1) ||
                        'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">Substance</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planetary Transit Visualizer */}
      {!loading && wheelTransits.length > 0 && (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Live Transit Visualizer
            </CardTitle>
            <CardDescription>
              Real-time plotting of celestial bodies triggering consciousness parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center p-0 md:p-6 overflow-hidden">
            <div className="w-full max-w-[600px] mx-auto scale-90 sm:scale-100 flex justify-center">
              <ZodiacWheel
                currentTransits={wheelTransits}
                natalChart={{ planets: [] }} // Empty natal chart to keep the wheel purely focused on current transits
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Free-body diagrams — every force acting on each planet right now */}
      {fbd && fbd.cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Planetary Free-Body Diagrams</CardTitle>
            <CardDescription>
              Every force acting on each planet, drawn at the exact arc minute it occupies — aspects
              at true ecliptic bearings, elemental sign and sect pulls, dignity, and momentum. The
              violet resultant is the planet&apos;s net alchemical tendency.
              {fbdOffCard > 0.005 && (
                <span className="block mt-1 opacity-70">
                  {fbdOffCard.toFixed(2)} ESMS sits off-card (the Ascendant grounding vessel is not
                  a planet and gets no diagram), so the cards deliberately do not sum to the sky
                  total.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="alchm-fbd-root grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {fbd.cards.map(card => (
                <PlanetFBDCard key={card.planet} fbd={card} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transit Activations */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading current transits...</p>
          </CardContent>
        </Card>
      ) : activations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No agents currently activated by transit degrees
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Planetary positions will activate agents when they match natal chart degrees
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Active Transit Connections
              </CardTitle>
              <CardDescription>
                Planets activating consciousness agents through degree resonance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activations.map(activation => (
                <div
                  key={activation.planet}
                  className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-lg border"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{getPlanetEmoji(activation.planet)}</div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {activation.planet} in {activation.sign}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {activation.degree.toFixed(1)}° - Activating {activation.agents.length}{' '}
                          agent
                          {activation.agents.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild className="flex items-center gap-1">
                      <Link
                        href={`/gallery?planet=${activation.planet}&sign=${activation.sign}&degree=${activation.degree.toFixed(1)}`}
                      >
                        View in Gallery
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activation.agents.map(({ agent, activationStrength }) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-2 px-3 py-1 bg-white dark:bg-black/20 rounded-full border"
                      >
                        <span className="text-sm font-medium">{agent.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {(activationStrength * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Group Chat Button */}
          {activatedAgentIds.length > 0 && (
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/50 dark:to-green-950/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Transit-Activated Council</h3>
                    <p className="text-sm text-muted-foreground">
                      {activatedAgents.map(a => a.name).join(', ')} are ready to engage
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setShowGroupChat(true)}
                    className="flex items-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Open Council Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Historical Council Chat - Auto-opened with activated agents */}
      <HistoricalCouncilChat
        isOpen={showGroupChat}
        onClose={() => setShowGroupChat(false)}
        historicalAgents={DEMO_AGENTS}
        filterBySelectedAgents={activatedAgentIds}
        title="Transit-Activated Consciousness Council"
        maxAgents={5}
        allowMonica={true}
        showAgentBiographies={true}
        enableTimelineView={false}
        enableEraFilters={false}
        enableSpecializationGroups={false}
      />
    </div>
  )
}
