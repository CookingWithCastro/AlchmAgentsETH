'use client'

import { useMemo, useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPlanetaryDignity } from '@/lib/astrological-data'
import { MoonPhaseAgentChat } from '@/components/misc/moon-phase-agent-chat'
import UnifiedMultiAgentChat from '@/components/misc/unified-multi-agent-chat'
import { getPlanetaryAgentStats } from '@/lib/agents/planetary-agent-stats'

import { createDefaultPlanetaryConfigs } from '@/lib/planetary-config-helper'
import { PLANETARY_COUNCIL_PRESETS, type PlanetaryCouncilPreset } from '@/lib/council-presets'
import {
  Users,
  Moon as MoonIcon,
  Sparkles,
  Crown,
  Star,
  X,
  Zap,
  Heart,
  Eye,
  Brain,
  Activity,
  Compass,
  Flame,
} from 'lucide-react'

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '⛢',
  Neptune: '♆',
  Pluto: '♇',
}

const ORDERED_PLANETS = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const

function getDignityLabel(dignity: string) {
  switch (dignity) {
    case 'domicile':
      return 'Domicile'
    case 'exaltation':
      return 'Exalted'
    case 'detriment':
      return 'Detriment'
    case 'fall':
      return 'Fall'
    default:
      return 'Peregrine'
  }
}

interface PlanetaryAgentsClientProps {
  /** Pre-fetched positions from RSC; keyed by planet name */
  initialPositions: Record<string, { sign: string; degree: number }>
}

function PlanetaryAgentsContent({ initialPositions }: PlanetaryAgentsClientProps) {
  // Seed state from server-fetched data — no useEffect fetch needed
  const [positions, setPositions] =
    useState<Record<string, { sign: string; degree: number }>>(initialPositions)
  const [showMoonChat, setShowMoonChat] = useState(false)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [showCouncilSelection, setShowCouncilSelection] = useState(false)
  const [showPlanetSelection, setShowPlanetSelection] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PlanetaryCouncilPreset | null>(null)
  const [selectedPlanets, setSelectedPlanets] = useState<string[]>([])
  const searchParams = useSearchParams()
  const router = useRouter()
  const agentId = searchParams.get('agent')

  const planetaryConfigs = useMemo(() => createDefaultPlanetaryConfigs(), [])

  useEffect(() => {
    if (agentId) {
      router.replace(`/gallery/chat/${agentId}`)
    }
  }, [agentId, router])

  const cards = useMemo(() => {
    return ORDERED_PLANETS.map(planet => {
      const pos = positions[planet]
      const sign = pos?.sign || '—'
      const degreeVal: number | null = typeof pos?.degree === 'number' ? pos.degree : null
      const degreeNum = degreeVal !== null ? Math.max(0, Math.min(29, Math.round(degreeVal))) : null
      const dignity = sign !== '—' ? getPlanetaryDignity(planet, sign) : 'peregrine'
      const dignityLabel = getDignityLabel(dignity)
      const stats = degreeNum !== null ? getPlanetaryAgentStats(planet, sign, degreeNum) : null
      const href =
        degreeNum !== null
          ? `/agents/${encodeURIComponent(planet)}/${encodeURIComponent(sign)}/${degreeNum}`
          : undefined

      return (
        <Link
          key={planet}
          href={href || '#'}
          aria-disabled={!href}
          className={!href ? 'pointer-events-none opacity-60' : ''}
        >
          <Card className="hover:shadow-lg hover:shadow-white/5 transition-all duration-300 h-full bg-black/40 backdrop-blur-md border-white/10 group overflow-hidden relative">
            {/* Subtle orbital ring decoration */}
            <div className="absolute -top-12 -right-12 w-32 h-32 border border-white/5 rounded-full transition-transform duration-700 group-hover:scale-150"></div>
            <div className="absolute -bottom-8 -left-8 w-24 h-24 border border-white/5 rounded-full transition-transform duration-700 group-hover:scale-150"></div>

            <CardHeader className="text-center relative z-10 pb-2">
              <div className="text-5xl mb-3 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-transform duration-500 group-hover:scale-110">
                {PLANET_SYMBOLS[planet]}
              </div>
              <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                {planet}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4 relative z-10">
              <div className="text-sm">
                {sign !== '—' && degreeNum !== null ? (
                  <span className="font-semibold px-3 py-1 rounded-full bg-white/5 border border-white/10 shadow-inner">
                    {sign} {degreeNum}°
                  </span>
                ) : (
                  <span className="text-muted-foreground animate-pulse">Aligning...</span>
                )}
              </div>
              <div>
                <Badge
                  variant="outline"
                  className={`
                  ${dignity === 'domicile' || dignity === 'exaltation' ? 'border-amber-500/50 text-amber-200 bg-amber-500/10' : ''}
                  ${dignity === 'detriment' || dignity === 'fall' ? 'border-slate-500/50 text-slate-300 bg-slate-500/10' : ''}
                  ${dignity === 'peregrine' ? 'border-white/20 text-white/70 bg-white/5' : ''}
                `}
                >
                  {dignityLabel}
                </Badge>
              </div>

              {/* Sacred Stats Mini View */}
              {stats && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className="grid grid-cols-2 gap-y-2 gap-x-1 text-xs text-left mb-3">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400/80 rounded-full"
                          style={{ width: `${stats.power}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Brain className="w-3 h-3 text-purple-400" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-400/80 rounded-full"
                          style={{ width: `${stats.wisdom}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-3 h-3 text-pink-400" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-400/80 rounded-full"
                          style={{ width: `${stats.charisma}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3 h-3 text-blue-400" />
                      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400/80 rounded-full"
                          style={{ width: `${stats.intuition}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Alchemical Dominance Badge */}
                  <div className="flex justify-center">
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase tracking-wider bg-black/50 border-white/10 flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      {stats.dominantAlchemical} Dominant
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      )
    })
  }, [positions])

  const handlePresetSelect = (preset: PlanetaryCouncilPreset) => {
    setSelectedPreset(preset)
    setSelectedPlanets(preset.planetaryAgentIds)
    setShowCouncilSelection(false)
    setShowGroupChat(true)
  }

  const activePlanetIds = useMemo(() => {
    if (selectedPreset) return selectedPreset.planetaryAgentIds
    return selectedPlanets
  }, [selectedPreset, selectedPlanets])

  const activePlanetaryConfigs = useMemo(() => {
    return planetaryConfigs.filter(config => activePlanetIds.includes(config.planet))
  }, [planetaryConfigs, activePlanetIds])

  // Early-return AFTER all hooks (rules-of-hooks). The useMemos above are pure,
  // so computing them before this redirect guard is harmless.
  if (agentId) {
    return (
      <div className="container py-8 text-center">
        <p>Redirecting to agent chat...</p>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0c0319] via-[#1a0838] to-[#0c0319] text-white selection:bg-purple-500/30">
        <div className="container py-12 relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-300 to-amber-200 drop-shadow-sm">
              Planetary Wisdom Agents
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-white/60 font-light">
              Consult planetary consciousness at their current zodiac positions. Each planet offers
              unique wisdom based on their sign, degree, and dignity.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Button
              onClick={() => setShowMoonChat(true)}
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <MoonIcon className="w-4 h-4" />
              Moon Phase Oracle
            </Button>
            <Button
              onClick={() => setShowCouncilSelection(!showCouncilSelection)}
              className="gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
            >
              <Crown className="w-4 h-4" />
              {showCouncilSelection ? 'Hide Council Presets' : 'Planetary Council Presets'}
            </Button>
            <Button
              onClick={() => {
                setShowPlanetSelection(!showPlanetSelection)
                if (!showPlanetSelection) {
                  setSelectedPlanets([])
                  setSelectedPreset(null)
                }
              }}
              className="gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
            >
              <Sparkles className="w-4 h-4" />
              {showPlanetSelection ? 'Hide Custom Chat' : 'Create Custom Group Chat'}
            </Button>
          </div>

          {/* Custom Planet Selection */}
          {showPlanetSelection && (
            <Card className="mb-8 border-2 border-amber-200 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                  Select Planets for Custom Group Chat
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  Click planets below to add them to your custom chat. Selected planets will chat
                  about the current moment.
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 mb-4">
                  {ORDERED_PLANETS.map(planet => {
                    const isSelected = selectedPlanets.includes(planet)
                    const pos = positions[planet]
                    return (
                      <Button
                        key={planet}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPlanets(selectedPlanets.filter(p => p !== planet))
                          } else if (selectedPlanets.length < 7) {
                            setSelectedPlanets([...selectedPlanets, planet])
                          }
                        }}
                        className={isSelected ? 'bg-amber-600 hover:bg-amber-700' : ''}
                      >
                        {PLANET_SYMBOLS[planet]} {planet}
                        {pos && ` (${pos.sign})`}
                      </Button>
                    )
                  })}
                </div>
                {selectedPlanets.length > 0 && (
                  <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm mb-2">
                      <strong>Selected ({selectedPlanets.length}/7):</strong>{' '}
                      {selectedPlanets.map(p => `${PLANET_SYMBOLS[p]} ${p}`).join(', ')}
                    </p>
                    <Button
                      onClick={() => {
                        setShowGroupChat(true)
                        setShowPlanetSelection(false)
                      }}
                      disabled={selectedPlanets.length === 0}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      Start Chat with {selectedPlanets.length} Planet
                      {selectedPlanets.length !== 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Council Selection Section */}
          {showCouncilSelection && (
            <Card className="mb-8 border-2 border-emerald-200 dark:border-emerald-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-emerald-600" />
                  Choose Your Celestial Council Preset
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PLANETARY_COUNCIL_PRESETS.map(preset => (
                    <Card
                      key={preset.id}
                      className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 border-2"
                      onClick={() => handlePresetSelect(preset)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{preset.name}</CardTitle>
                            <Badge variant="outline" className="mt-1">
                              {preset.difficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span className="text-sm">{preset.planetaryAgentIds.length}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-500" />
                            <span className="text-sm font-medium">Focus:</span>
                          </div>
                          <p className="text-sm text-muted-foreground ml-6">
                            {preset.astrological_focus}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          {preset.planetCombination.map(planet => {
                            const symbol =
                              PLANET_SYMBOLS[planet as keyof typeof PLANET_SYMBOLS] || ''
                            return (
                              <Badge key={planet} variant="outline" className="text-xs">
                                {symbol} {planet}
                              </Badge>
                            )
                          })}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Crown
                            className={`w-4 h-4 ${preset.includeMonica ? 'text-purple-500' : 'text-gray-300'}`}
                          />
                          <span className="text-sm">
                            {preset.includeMonica
                              ? `Monica as ${preset.monicaRole}`
                              : 'Pure planetary wisdom'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-3">
                          {preset.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Planetary position cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
            {cards}
          </div>

          <div className="text-center text-xs text-white/40 mt-12 bg-black/20 rounded-full py-2 px-6 inline-block mx-auto backdrop-blur-sm border border-white/5">
            Current planetary positions calculated using Swiss Ephemeris. Positions remain accurate
            throughout your session.
          </div>
        </div>
      </div>

      {/* Moon Phase Chat Modal */}
      {showMoonChat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Moon Phase Oracle</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowMoonChat(false)}>
                ×
              </Button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <MoonPhaseAgentChat />
            </div>
          </div>
        </div>
      )}

      {/* Planetary Group Chat */}
      <UnifiedMultiAgentChat
        isOpen={showGroupChat}
        onClose={() => {
          setShowGroupChat(false)
          if (!selectedPreset) setSelectedPlanets([])
        }}
        title={
          selectedPreset
            ? selectedPreset.name
            : selectedPlanets.length > 0
              ? `Custom Chat: ${selectedPlanets.map(p => PLANET_SYMBOLS[p]).join(' ')}`
              : 'Planetary Council'
        }
        variant="planetary"
        historicalAgents={[]}
        planetaryConfigs={activePlanetaryConfigs}
        initialAgents={activePlanetIds}
        maxAgents={7}
        allowMonica={selectedPreset?.includeMonica !== false}
        enableGroupDynamics={true}
        enableExport={true}
        enableAutoSync={true}
      />
    </>
  )
}

export default function PlanetaryAgentsClient(props: PlanetaryAgentsClientProps) {
  return (
    <Suspense fallback={<div className="container py-8 text-center">Loading...</div>}>
      <PlanetaryAgentsContent {...props} />
    </Suspense>
  )
}
