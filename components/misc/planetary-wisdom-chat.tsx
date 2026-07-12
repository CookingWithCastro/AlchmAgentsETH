'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sun,
  Moon,
  Zap,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  Star,
  Globe,
  Activity,
  Sparkles,
  Crown,
  Users,
} from 'lucide-react'

import UnifiedMultiAgentChat from './unified-multi-agent-chat'
import type { ChatSession } from '@/lib/unified-agent-types'
import {
  createDefaultPlanetaryConfigs,
  updatePlanetaryConfigWithLiveSky,
  type PlanetaryConfig,
} from '@/lib/planetary-config-helper'
import {
  PLANETARY_COUNCIL_PRESETS,
  getOptimalMonicaRole,
  type PlanetaryCouncilPreset,
} from '@/lib/council-presets'
import { usePlanetaryPositions, type PlanetaryPosition } from '@/hooks/usePlanetaryPositions'

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

const SIGN_ELEMENTS: Record<string, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire',
  Leo: 'Fire',
  Sagittarius: 'Fire',
  Taurus: 'Earth',
  Virgo: 'Earth',
  Capricorn: 'Earth',
  Gemini: 'Air',
  Libra: 'Air',
  Aquarius: 'Air',
  Cancer: 'Water',
  Scorpio: 'Water',
  Pisces: 'Water',
}

const MAJOR_ASPECTS = [
  { type: 'Conjunction', angle: 0, orb: 8 },
  { type: 'Sextile', angle: 60, orb: 5 },
  { type: 'Square', angle: 90, orb: 6 },
  { type: 'Trine', angle: 120, orb: 6 },
  { type: 'Opposition', angle: 180, orb: 8 },
]

function getPlanetLongitude(position: PlanetaryPosition) {
  const signIndex = SIGN_ORDER.findIndex(sign => sign.toLowerCase() === position.sign.toLowerCase())
  return (Math.max(signIndex, 0) * 30 + position.degree + 360) % 360
}

function getAngularDistance(a: number, b: number) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function calculateCurrentAspects(positions: PlanetaryPosition[]) {
  const aspects: Array<{
    planetA: string
    planetB: string
    type: string
    orb: number
    angle: number
  }> = []

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const first = positions[i]
      const second = positions[j]
      const distance = getAngularDistance(getPlanetLongitude(first), getPlanetLongitude(second))

      for (const aspect of MAJOR_ASPECTS) {
        const orb = Math.abs(distance - aspect.angle)
        if (orb <= aspect.orb) {
          aspects.push({
            planetA: first.planet,
            planetB: second.planet,
            type: aspect.type,
            orb,
            angle: Math.round(distance),
          })
          break
        }
      }
    }
  }

  return aspects.sort((a, b) => a.orb - b.orb)
}

function calculateDominantElement(positions: PlanetaryPosition[]) {
  const scores = { Fire: 0, Earth: 0, Air: 0, Water: 0 }

  for (const position of positions) {
    const canonicalSign = SIGN_ORDER.find(
      sign => sign.toLowerCase() === position.sign.toLowerCase()
    )
    const element = canonicalSign ? SIGN_ELEMENTS[canonicalSign] : null
    if (element) scores[element] += 1
  }

  return Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]
}

function calculateLunarPhase(positions: PlanetaryPosition[]) {
  const sun = positions.find(position => position.planet.toLowerCase() === 'sun')
  const moon = positions.find(position => position.planet.toLowerCase() === 'moon')

  if (!sun || !moon) return 'Unknown'

  const angle = (getPlanetLongitude(moon) - getPlanetLongitude(sun) + 360) % 360
  const phaseIndex = Math.round(angle / 45) % 8

  return [
    'New Moon',
    'Waxing Crescent',
    'First Quarter',
    'Waxing Gibbous',
    'Full Moon',
    'Waning Gibbous',
    'Last Quarter',
    'Waning Crescent',
  ][phaseIndex]
}

interface PlanetaryWisdomChatProps {
  // Core functionality
  isOpen: boolean
  onClose: () => void

  // Initial setup
  defaultActivePlanets?: string[]
  initialPreset?: string

  // Live sky features
  enableAutoSync?: boolean
  syncInterval?: number
  showCurrentSkyChart?: boolean
  enableTransitAlerts?: boolean
  planetaryHourNotifications?: boolean

  // Configuration
  title?: string
  maxAgents?: number
  allowMonica?: boolean

  // Callbacks
  onSessionUpdate?: (session: ChatSession) => void
  onAgentEvolution?: (agentId: string, evolution: any) => void
}

export function PlanetaryWisdomChat({
  isOpen,
  onClose,
  defaultActivePlanets = ['Sun', 'Moon', 'Mercury'],
  initialPreset,
  enableAutoSync = true,
  syncInterval = 60000,
  showCurrentSkyChart = true,
  enableTransitAlerts = true,
  planetaryHourNotifications = true,
  title = 'Celestial Council',
  maxAgents = 7,
  allowMonica = true,
  onSessionUpdate,
  onAgentEvolution,
}: PlanetaryWisdomChatProps) {
  // State management
  const [selectedPreset, setSelectedPreset] = useState<PlanetaryCouncilPreset | null>(
    initialPreset ? PLANETARY_COUNCIL_PRESETS.find(p => p.id === initialPreset) || null : null
  )
  const [customPlanets, setCustomPlanets] = useState<string[]>(defaultActivePlanets)
  const [showPresetSelection, setShowPresetSelection] = useState(!selectedPreset)
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(enableAutoSync)
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [transitAlerts, setTransitAlerts] = useState<string[]>([])

  // Live planetary data
  const { planetaryPositions, loading: positionsLoading } = usePlanetaryPositions()

  // Base planetary configurations
  const [planetaryConfigs, setPlanetaryConfigs] = useState<PlanetaryConfig[]>(
    createDefaultPlanetaryConfigs()
  )

  // Update configurations with live sky data
  useEffect(() => {
    if (autoSyncEnabled && planetaryPositions) {
      const updatedConfigs = planetaryConfigs.map(config =>
        updatePlanetaryConfigWithLiveSky(config, planetaryPositions)
      )
      setPlanetaryConfigs(updatedConfigs)
      setLastSyncTime(new Date())
    }
  }, [planetaryPositions, autoSyncEnabled, planetaryConfigs])

  // Auto-sync interval
  useEffect(() => {
    if (!autoSyncEnabled) return

    const interval = setInterval(() => {
      // Trigger re-fetch of planetary positions
      setLastSyncTime(new Date())
    }, syncInterval)

    return () => clearInterval(interval)
  }, [autoSyncEnabled, syncInterval])

  // Active planetary agents based on preset or custom selection
  const activePlanetIds = useMemo(() => {
    if (selectedPreset) {
      return selectedPreset.planetaryAgentIds
    }
    return customPlanets
  }, [selectedPreset, customPlanets])

  // Filter planetary configs to active agents
  const activePlanetaryConfigs = useMemo(() => {
    return planetaryConfigs.filter(config => activePlanetIds.includes(config.planet))
  }, [planetaryConfigs, activePlanetIds])

  // Calculate current astrological information
  const currentAstroInfo = useMemo(() => {
    if (!planetaryPositions || planetaryPositions.length === 0) return null

    const aspects = calculateCurrentAspects(planetaryPositions)
    const retrogrades = planetaryPositions
      .filter(position => position.retrograde)
      .map(position => position.planet)

    return {
      dominantElement: calculateDominantElement(planetaryPositions),
      majorAspects: aspects,
      retrogradeCount: retrogrades.length,
      retrogradePlanets: retrogrades,
      lunarPhase: calculateLunarPhase(planetaryPositions),
    }
  }, [planetaryPositions])

  // Handle preset selection
  const handlePresetSelect = (preset: PlanetaryCouncilPreset) => {
    setSelectedPreset(preset)
    setCustomPlanets(preset.planetaryAgentIds)
    setShowPresetSelection(false)
  }

  // Handle custom selection
  const handleCreateCustomCouncil = () => {
    setSelectedPreset(null)
    setShowPresetSelection(false)
  }

  // Toggle auto-sync
  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled)
    if (enabled) {
      setLastSyncTime(new Date())
    }
  }

  // Manual sync
  const handleManualSync = () => {
    setLastSyncTime(new Date())
    // Force refresh of planetary positions
  }

  // Render preset selection
  const renderPresetSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold font-headline mb-2 text-[#e0e4d2]">
          Choose Your Celestial Council
        </h2>
        <p className="text-sm font-mono-label tracking-widest text-[#8c947c] uppercase">
          Select planetary agents for cosmic guidance
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLANETARY_COUNCIL_PRESETS.map(preset => (
          <Card
            key={preset.id}
            className="cursor-pointer transition-all bg-[#050506]/90 backdrop-blur-md border border-[#23262B] hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] text-white hover:scale-[1.01] duration-300 rounded-xl overflow-hidden"
            onClick={() => handlePresetSelect(preset)}
          >
            <CardHeader className="pb-3 border-b border-[#23262B]/50 bg-white/[0.01] px-5 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-headline text-[#e0e4d2]">
                    {preset.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="mt-1.5 border-purple-500/30 bg-purple-500/10 text-purple-300 font-mono-label text-[9px] uppercase tracking-wider"
                  >
                    {preset.difficulty}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-[#8c947c] font-mono-label text-xs">
                  <Users className="w-3.5 h-3.5" />
                  <span>{preset.planetaryAgentIds.length}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 py-4 space-y-4">
              <p className="text-xs font-body text-[#c2cab0] leading-relaxed">
                {preset.description}
              </p>

              <div className="space-y-1.5 rounded-lg bg-black/45 border border-[#23262B]/75 p-3">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] font-mono-label uppercase tracking-widest text-[#8c947c]">
                    Focus:
                  </span>
                </div>
                <p className="text-xs font-body text-[#e0e4d2] ml-5">{preset.astrological_focus}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {preset.planetCombination.map(planet => (
                  <Badge
                    key={planet}
                    variant="outline"
                    className="border-[#424936] bg-[#050506]/55 text-[#c2cab0] font-mono-label text-[9px] tracking-wider"
                  >
                    {planet}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t border-[#23262B]/55 pt-3">
                <Crown
                  className={`w-3.5 h-3.5 ${preset.includeMonica ? 'text-purple-400' : 'text-gray-600'}`}
                />
                <span className="text-[10px] font-mono-label uppercase tracking-widest text-[#8c947c]">
                  {preset.includeMonica ? `Monica: ${preset.monicaRole}` : 'Pure planetary wisdom'}
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-1.5">
                {preset.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-[#1A0C2B] text-purple-300 font-mono-label text-[9px] hover:bg-[#1A0C2B]"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Council Option */}
      <Card
        className="cursor-pointer transition-all bg-[#050506]/90 border-dashed border-2 border-[#424936]/40 hover:border-[#b8fc4b]/40 hover:shadow-[0_0_20px_rgba(184,252,75,0.08)] text-white duration-300 rounded-xl"
        onClick={handleCreateCustomCouncil}
      >
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Sparkles className="w-8 h-8 text-[#b8fc4b] mx-auto mb-2 animate-pulse" />
            <h3 className="font-headline text-lg text-[#e0e4d2] mb-1">Create Custom Council</h3>
            <p className="text-xs font-mono-label tracking-widest text-[#8c947c] uppercase">
              Select your own planetary combination
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Render live sky status
  const renderLiveSkyStatus = () => (
    <Card className="mb-6 bg-[#050506]/95 backdrop-blur-md border border-[#23262B] text-white shadow-[0_0_35px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-[#23262B]/55 bg-white/[0.01] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className={`w-5 h-5 ${autoSyncEnabled ? 'text-[#b8fc4b]' : 'text-[#8c947c]'}`} />
            <CardTitle className="text-lg font-headline text-[#e0e4d2]">
              Celestial Telemetry
            </CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono-label text-[10px] text-[#8c947c] uppercase tracking-wider">
                Live Sync
              </span>
              <Switch
                checked={autoSyncEnabled}
                onCheckedChange={handleAutoSyncToggle}
                className="data-[state=checked]:bg-[#b8fc4b]"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              disabled={autoSyncEnabled}
              className="border border-[#23262B] bg-[#050506]/50 hover:bg-[#0A0A0B] text-white disabled:opacity-40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Sync Status */}
          <div className="rounded-lg border border-[#23262B] bg-[#0A0A0B]/80 px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${autoSyncEnabled ? 'bg-[#b8fc4b] animate-pulse' : 'bg-orange-500'}`}
              />
              <span className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                Sync Engine
              </span>
            </div>
            <div className="text-xs font-mono text-[#e0e4d2]">
              <div>{autoSyncEnabled ? 'ACTIVE RELAY' : 'MANUAL HOLD'}</div>
              <div className="text-[#8c947c] text-[10px] mt-0.5">
                {lastSyncTime.toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Current Astro Info */}
          {currentAstroInfo && (
            <>
              <div className="rounded-lg border border-[#23262B] bg-[#0A0A0B]/80 px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                    Dominant Element
                  </span>
                </div>
                <div className="text-xs font-mono text-[#b8fc4b]">
                  {currentAstroInfo.dominantElement.toUpperCase()}
                </div>
              </div>

              <div className="rounded-lg border border-[#23262B] bg-[#0A0A0B]/80 px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#7bd1fa]" />
                  <span className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                    Lunar Phase
                  </span>
                </div>
                <div className="text-xs font-mono text-[#c2cab0] truncate">
                  {currentAstroInfo.lunarPhase}
                </div>
              </div>

              <div className="rounded-lg border border-[#23262B] bg-[#0A0A0B]/80 px-4 py-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-mono-label text-[9px] uppercase tracking-widest text-[#8c947c]">
                    Retrogrades
                  </span>
                </div>
                <div className="text-xs font-mono text-orange-300">
                  {currentAstroInfo.retrogradeCount === 0
                    ? 'STABLE DIRECT'
                    : `${currentAstroInfo.retrogradeCount} FLUX NODES`}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active Council */}
        {activePlanetIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#23262B]/55">
            <div className="flex items-center gap-2 mb-2.5">
              <Users className="w-3.5 h-3.5 text-[#8c947c]" />
              <span className="font-mono-label text-[10px] uppercase tracking-widest text-[#8c947c]">
                Active Council Linkage
              </span>
              {selectedPreset && (
                <Badge
                  variant="outline"
                  className="border-purple-500/30 bg-[#1A0C2B] text-purple-300 font-mono-label text-[9px]"
                >
                  {selectedPreset.name}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {activePlanetaryConfigs.map(config => (
                <div
                  key={config.planet}
                  className="flex items-center gap-2 rounded-lg border border-[#23262B]/75 bg-black/45 px-3 py-1.5 text-xs font-mono"
                >
                  <span style={{ color: config.color }} className="text-sm">
                    {config.symbol}
                  </span>
                  <span className="text-[#e0e4d2] font-semibold">{config.planet}</span>
                  <span className="text-[#8c947c] text-[10px]">in {config.sign}</span>
                </div>
              ))}
              {selectedPreset?.includeMonica && (
                <div className="flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-xs font-mono">
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-purple-300 font-semibold">Monica</span>
                  <span className="text-purple-400/70 text-[10px]">
                    ({selectedPreset.monicaRole})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <>
      {/* Preset Selection Modal */}
      {showPresetSelection && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#0c0319] border border-purple-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden text-white">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Select Planetary Council</h2>
                <Button variant="ghost" onClick={() => setShowPresetSelection(false)}>
                  ×
                </Button>
              </div>
              <ScrollArea className="max-h-[70vh]">{renderPresetSelection()}</ScrollArea>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Interface */}
      <UnifiedMultiAgentChat
        // Core configuration
        isOpen={isOpen && !showPresetSelection}
        onClose={onClose}
        title={title}
        variant="planetary"
        // Agent configuration
        historicalAgents={[]}
        planetaryConfigs={activePlanetaryConfigs}
        initialAgents={activePlanetIds}
        maxAgents={maxAgents}
        allowMonica={selectedPreset?.includeMonica || allowMonica}
        enableAutoSync={autoSyncEnabled}
        // Planetary-specific features
        enableGroupDynamics={true}
        enableExport={true}
        enablePresets={true}
        enableMemoryPersistence={true}
        // Callbacks
        onSessionUpdate={onSessionUpdate}
        onAgentEvolution={onAgentEvolution}
        // Custom header content
        customHeader={renderLiveSkyStatus()}
      />
    </>
  )
}

export default PlanetaryWisdomChat
