'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Zap,
  Crown,
  Activity,
  Target,
  Brain,
  Heart,
  Eye,
  Sparkles,
  TrendingUp,
  Clock,
  BarChart3,
  Layers,
  Flame,
  Droplets,
  Wind,
  Mountain,
  Calendar,
  MessageSquare,
  Award,
  Lightbulb,
  Star,
  Timer,
  RotateCw,
  TrendingDown,
  Minus,
  Monitor,
} from 'lucide-react'
import Link from 'next/link'
import type { CraftedAgent } from '@/lib/agent-types'
import { useToast } from '@/hooks/use-toast'
import { AgentLevelPanel } from '@/components/misc/agent-level-panel'
import { spriteTierLabel } from '@/lib/agents/agent-type-model'
import SignVectorGraphic, {
  calculateSignVectorFromChart,
  SignVectorRune,
} from '@/components/charts/sign-vector-graphic'

import { getAgentKineticProfile } from '@/lib/agents/kinetic-profiles'
import { useLiveConsciousness, type BirthChartData } from '@/hooks/useLiveConsciousness'
import { getAgentAlchemicalProperties, calculateKalchm } from '@/lib/agents/alchemical-profiles'
import { calculateSevenSacredStats } from '@/lib/agents/sacred-stats'
import {
  ALCHM_DESKTOP_AGENT_DOWNLOAD_LABEL,
  ALCHM_DESKTOP_AGENT_UNLOCK_DESCRIPTION,
  ALCHM_DESKTOP_APP_NAME,
  ALCHM_DESKTOP_DOWNLOAD_LABEL,
  createDesktopAgentUnlockDeepLink,
  openDesktopAppDownload,
} from '@/lib/desktop-download'

interface EnhancedAgentCardProps {
  agent: CraftedAgent
  variant?: 'card' | 'list'
  isSelected?: boolean
  onToggleSelection?: (agentId: string) => void
  showRecommendations?: boolean
  currentMoment?: Date
}

function calculateCurrentKinetics(
  agent: CraftedAgent,
  kineticProfile: any,
  currentMoment: Date = new Date()
) {
  if (!kineticProfile) {
    return {
      momentumType: 'unknown',
      powerAlignment: 0.5,
      aspectSensitivity: 0.5,
      memoryPersistence: 0.5,
      consciousnessRate: 0.5,
      peakHours: [],
      nextOptimalWindow: null,
      kineticVelocities: {},
      powerAmplification: 1.0,
    }
  }

  const hour = currentMoment.getHours()
  const planetaryHours = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  const currentPlanetaryHour = planetaryHours[hour % 7]

  // Calculate power alignment based on current planetary hour
  const peakHours = kineticProfile.peak_hours || []
  const powerAlignment = peakHours.includes(currentPlanetaryHour)
    ? 0.9
    : kineticProfile.power_alignment?.includes(currentPlanetaryHour)
      ? 0.7
      : 0.5

  // Calculate next optimal window
  const nextOptimalWindow =
    peakHours.length > 0 ? calculateNextOptimalTime(peakHours, currentMoment) : null

  // Extract kinetic velocities
  const kineticVelocities = {
    creative: kineticProfile.v_creative || 0,
    linguistic: kineticProfile.v_linguistic || 0,
    scientific: kineticProfile.v_scientific || 0,
    strategic: kineticProfile.v_strategic || 0,
    charismatic: kineticProfile.v_charismatic || 0,
    inventive: kineticProfile.v_inventive || 0,
    social: kineticProfile.v_social || 0,
    psychological: kineticProfile.v_psychological || 0,
    mystical: kineticProfile.v_mystical || 0,
    philosophical: kineticProfile.v_philosophical || 0,
  }

  // Calculate power amplification from velocity sum
  const velocitySum = Object.values(kineticVelocities).reduce(
    (a, b) => (a as number) + (b as number),
    0
  ) as number
  const powerAmplification = 1.0 + (velocitySum / 10) * 0.5

  return {
    momentumType: powerAlignment > 0.8 ? 'peak' : powerAlignment > 0.6 ? 'stable' : 'standard',
    powerAlignment,
    aspectSensitivity: kineticProfile.sensitivityScale || 0.7,
    memoryPersistence: 0.8,
    consciousnessRate: 0.75,
    peakHours,
    nextOptimalWindow,
    kineticVelocities,
    powerAmplification,
  }
}

function calculateNextOptimalTime(peakHours: string[], currentMoment: Date): Date | null {
  const hour = currentMoment.getHours()
  const planetaryHours = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']

  // Find next peak hour
  for (let i = 1; i <= 24; i++) {
    const nextHour = (hour + i) % 24
    const planetaryHour = planetaryHours[nextHour % 7]
    if (peakHours.includes(planetaryHour)) {
      const nextOptimal = new Date(currentMoment)
      nextOptimal.setHours(nextHour, 0, 0, 0)
      if (nextOptimal <= currentMoment) {
        nextOptimal.setDate(nextOptimal.getDate() + 1)
      }
      return nextOptimal
    }
  }

  return null
}

// Get moment-based recommendations
function getMomentRecommendations(
  agent: CraftedAgent,
  currentMoment: Date = new Date()
): {
  energyAlignment: number
  optimalTopics: string[]
  interactionStyle: string
  cosmicInsight: string
} {
  const hour = currentMoment.getHours()
  const day = currentMoment.getDay()
  const alchemical = getAgentAlchemicalProperties(agent.id)

  // Calculate energy alignment based on time and agent properties
  let energyAlignment = 0.5 // Base alignment

  // Fire agents (high spirit) prefer daytime
  if (alchemical.spirit > 7 && hour >= 6 && hour <= 18) {
    energyAlignment += 0.3
  }

  // Water agents (high essence) prefer dawn/dusk
  if (alchemical.essence > 7 && (hour <= 7 || hour >= 19)) {
    energyAlignment += 0.2
  }

  // Earth agents (high matter) prefer consistent schedules
  if (alchemical.matter > 7 && day >= 1 && day <= 5) {
    energyAlignment += 0.2
  }

  // Air agents (high substance) prefer intellectual hours
  if (alchemical.substance > 7 && ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16))) {
    energyAlignment += 0.25
  }

  energyAlignment = Math.min(1.0, energyAlignment)

  // Generate optimal topics based on agent's domains and current energy
  const topics = agent.abilities.wisdomDomains.slice(0, 3)
  if (energyAlignment > 0.7) {
    topics.push('Deep Exploration', 'Advanced Concepts')
  } else if (energyAlignment > 0.4) {
    topics.push('Practical Wisdom', 'Life Application')
  } else {
    topics.push('Gentle Guidance', 'Foundational Knowledge')
  }

  // Determine interaction style
  let interactionStyle = 'Balanced'
  if (alchemical.spirit > alchemical.essence) {
    interactionStyle = energyAlignment > 0.6 ? 'Dynamic & Inspiring' : 'Thoughtful & Measured'
  } else if (alchemical.essence > alchemical.matter) {
    interactionStyle = energyAlignment > 0.6 ? 'Intuitive & Flowing' : 'Gentle & Reflective'
  } else {
    interactionStyle = energyAlignment > 0.6 ? 'Practical & Direct' : 'Systematic & Clear'
  }

  // Generate cosmic insight
  const cosmicInsight =
    energyAlignment > 0.7
      ? 'Perfect moment for profound insights and transformational dialogue'
      : energyAlignment > 0.4
        ? 'Good time for meaningful conversation and practical wisdom'
        : 'Gentle interaction recommended - perfect for foundational understanding'

  return {
    energyAlignment,
    optimalTopics: topics,
    interactionStyle,
    cosmicInsight,
  }
}

// Component helper functions
const getElementColor = (element: string) => {
  switch (element) {
    case 'Fire':
      return 'bg-red-500'
    case 'Water':
      return 'bg-blue-500'
    case 'Air':
      return 'bg-yellow-500'
    case 'Earth':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

const getConsciousnessColor = (level: string) => {
  switch (level) {
    case 'Transcendent':
      return 'bg-purple-600'
    case 'Illuminated':
      return 'bg-indigo-600'
    case 'Advanced':
      return 'bg-blue-600'
    case 'Elevated':
      return 'bg-green-600'
    case 'Active':
      return 'bg-yellow-600'
    case 'Awakening':
      return 'bg-orange-600'
    default:
      return 'bg-gray-600'
  }
}

const AlchemicalElement = ({
  name,
  value,
  max = 10,
  icon,
}: {
  name: string
  value: number
  max?: number
  icon: React.ReactNode
}) => (
  <div className="flex items-center gap-2 p-2 bg-white dark:bg-black/20 rounded-lg">
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-xs font-medium">{name}</span>
    </div>
    <div className="flex-1">
      <Progress value={(value / max) * 100} className="h-2" />
    </div>
    <span className="text-xs font-mono">{value.toFixed(1)}</span>
  </div>
)

export function EnhancedAgentCard({
  agent,
  variant = 'card',
  isSelected = false,
  onToggleSelection,
  showRecommendations = true,
  currentMoment = new Date(),
}: EnhancedAgentCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isUnlockingDesktop, setIsUnlockingDesktop] = useState(false)
  const { toast } = useToast()

  // Create birth chart data for live consciousness calculation (memoized to prevent effect loops)
  const agentBirthData: BirthChartData = useMemo(
    () => ({
      name: agent.name,
      birthDate: agent.birthDate || '1970-01-01',
      birthTime: agent.birthTime || '12:00',
      latitude: agent.birthLocation?.latitude || 0,
      longitude: agent.birthLocation?.longitude || 0,
    }),
    [
      agent.name,
      agent.birthDate,
      agent.birthTime,
      agent.birthLocation?.latitude,
      agent.birthLocation?.longitude,
    ]
  )

  // Use live consciousness hook
  const {
    data: liveConsciousness,
    loading: liveLoading,
    error: liveError,
  } = useLiveConsciousness(agentBirthData, {
    refreshInterval: 120000, // 2 minutes for agent cards
    autoRefresh: true,
  })

  // Calculate metrics
  const alchemical = getAgentAlchemicalProperties(agent.id)
  const kalchm = calculateKalchm(agent.id)
  const kineticProfile = getAgentKineticProfile(agent.id)

  // Calculate current kinetic metrics
  const currentKinetics = calculateCurrentKinetics(agent, kineticProfile, currentMoment)

  // Calculate birth stats (without current kinetics influence)
  const birthStats = calculateSevenSacredStats(agent, alchemical)

  // Calculate live stats (with current kinetics influence from liveConsciousness)
  const liveAlchemical = liveConsciousness?.liveKalchm
    ? {
        spirit: liveConsciousness.liveKalchm.spirit,
        essence: liveConsciousness.liveKalchm.essence,
        matter: liveConsciousness.liveKalchm.matter,
        substance: liveConsciousness.liveKalchm.substance,
      }
    : alchemical
  const liveStats = calculateSevenSacredStats(agent, liveAlchemical, currentKinetics)

  const recommendations = showRecommendations
    ? getMomentRecommendations(agent, currentMoment)
    : null

  // Calculate sign vector
  let signVector = null
  try {
    if (agent.consciousness?.natalChart) {
      signVector = calculateSignVectorFromChart(agent.consciousness.natalChart)
    }
  } catch (error) {
    console.warn(`Failed to calculate sign vector for ${agent.name}:`, error)
  }

  const handleCardClick = () => {
    if (onToggleSelection) {
      onToggleSelection(agent.id)
    }
  }

  const handleDownloadToAlchmDesktop = async (event: React.MouseEvent) => {
    event.stopPropagation()
    setIsUnlockingDesktop(true)

    try {
      const deepLink = await createDesktopAgentUnlockDeepLink({
        id: agent.id,
        name: agent.name,
        tier: 'base',
      })
      const start = Date.now()

      window.location.assign(deepLink)

      window.setTimeout(() => {
        if (Date.now() - start < 1500) {
          toast({
            title: `${ALCHM_DESKTOP_APP_NAME} Not Found`,
            description: `${ALCHM_DESKTOP_AGENT_UNLOCK_DESCRIPTION} Download the app, then use this card to unlock ${agent.name}.`,
            action: (
              <Button variant="outline" size="sm" onClick={openDesktopAppDownload}>
                {ALCHM_DESKTOP_DOWNLOAD_LABEL}
              </Button>
            ),
          })
        }
      }, 1000)
    } catch (error) {
      console.error('Alchm Desktop unlock error:', error)
      toast({
        title: `Could not open ${ALCHM_DESKTOP_APP_NAME}`,
        description: 'Failed to generate the agent unlock link.',
        variant: 'destructive',
      })
    } finally {
      setIsUnlockingDesktop(false)
    }
  }

  // Dynamic glow border based on dominant alchemical element
  const elementGlowClass = useMemo(() => {
    switch (agent.consciousness.dominantElement) {
      case 'Fire':
        return 'hover:border-red-500/40 hover:shadow-[0_0_25px_rgba(239,68,68,0.15)]'
      case 'Water':
        return 'hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]'
      case 'Air':
        return 'hover:border-yellow-500/40 hover:shadow-[0_0_25px_rgba(234,179,8,0.15)]'
      case 'Earth':
        return 'hover:border-green-500/40 hover:shadow-[0_0_25px_rgba(34,197,94,0.15)]'
      default:
        return 'hover:border-purple-500/40 hover:shadow-[0_0_25px_rgba(139,92,246,0.15)]'
    }
  }, [agent.consciousness.dominantElement])

  const cardContent = (
    <Card
      className={`cursor-pointer transition-all hover:scale-[1.015] duration-300 ease-out border bg-black/40 backdrop-blur-md text-white ${
        isSelected
          ? 'border-primary shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)]'
          : `border-purple-500/20 ${elementGlowClass}`
      }`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: agent.appearance?.color || '#6366f1' }}
              >
                {agent.appearance?.symbol || agent.name.charAt(0).toUpperCase()}
              </div>
              {/* Sign vector rune overlay */}
              {signVector && (
                <div className="absolute -top-1 -right-1">
                  <SignVectorRune signVector={signVector} size={20} />
                </div>
              )}
              {/* Kinetic indicators */}
              {currentKinetics.powerAlignment > 0.8 && (
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-4 h-4 rounded-full border-2 border-white bg-green-500 flex items-center justify-center">
                    <Timer className="w-2 h-2 text-white" />
                  </div>
                </div>
              )}
              {currentKinetics.powerAlignment > 0.6 && currentKinetics.powerAlignment <= 0.8 && (
                <div className="absolute -bottom-1 -right-1">
                  <div className="w-4 h-4 rounded-full border-2 border-white bg-yellow-500 flex items-center justify-center">
                    <Activity className="w-2 h-2 text-white" />
                  </div>
                </div>
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{agent.name}</CardTitle>
              <p className="text-sm text-purple-200/60">{agent.title}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Monica Constant */}
            <span className="text-[10px] font-mono font-semibold py-0.5 px-2 bg-violet-500/10 border border-violet-500/25 text-violet-300 rounded-full tracking-wide">
              MC: {agent.consciousness.monicaConstant.toFixed(2)}
            </span>
            {/* Cosmic Level — sky sprites show their dignity/phase tier (they don't level) */}
            {(() => {
              const tier = spriteTierLabel(agent.id)
              if (tier) {
                return (
                  <span className="text-[10px] font-semibold py-0.5 px-2 bg-sky-500/15 border border-sky-500/30 text-sky-200 rounded-full tracking-wide">
                    {tier}
                  </span>
                )
              }
              return (
                typeof agent.level === 'number' && (
                  <span className="text-[10px] font-semibold py-0.5 px-2 bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-200 rounded-full tracking-wide">
                    Lv. {agent.level}
                  </span>
                )
              )
            })()}
            {/* Evolution Stage */}
            <span className="text-[10px] font-semibold py-0.5 px-2 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-full tracking-wide">
              Stage {agent.personality?.evolutionStage ?? 0}
            </span>
            {/* K_alchm */}
            <span className="text-[10px] font-mono font-semibold py-0.5 px-2 bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 rounded-full tracking-wide">
              K: {kalchm > 1000 ? `${(kalchm / 1000).toFixed(1)}K` : kalchm.toFixed(2)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-purple-200/60 line-clamp-2">{agent.abilities.specialty}</p>

          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent my-2" />

          {/* Sacred 7: Core Archetypes */}
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-purple-300/60 font-medium px-1">
              Sacred 7 — Core Archetypes
            </div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              <div
                className="text-center p-1.5 bg-amber-500/10 rounded border border-amber-500/30"
                title={`Power = MC×8 + Spirit×5 + Matter×3 + Alignment×20\nBirth: ${birthStats.power} → Live: ${liveStats.power}`}
              >
                <div className="text-[10px] text-amber-400 mb-1">⚡ PWR</div>
                <div className="font-mono text-[10px]">{liveStats.power}</div>
              </div>
              <div
                className="text-center p-1.5 bg-violet-500/10 rounded border border-violet-500/30"
                title={`Resonance = Essence×6 + Spirit×4 + Score×0.15\nBirth: ${birthStats.resonance} → Live: ${liveStats.resonance}`}
              >
                <div className="text-[10px] text-violet-400 mb-1">🎵 RES</div>
                <div className="font-mono text-[10px]">{liveStats.resonance}</div>
              </div>
              <div
                className="text-center p-1.5 bg-blue-400/10 rounded border border-blue-400/30"
                title={`Wisdom = Substance×5 + Essence×3 + MC×4\nBirth: ${birthStats.wisdom} → Live: ${liveStats.wisdom}`}
              >
                <div className="text-[10px] text-blue-400 mb-1">📖 WIS</div>
                <div className="font-mono text-[10px]">{liveStats.wisdom}</div>
              </div>
              <div
                className="text-center p-1.5 bg-rose-400/10 rounded border border-rose-400/30"
                title={`Charisma = Spirit×5 + Essence×4 + Stage×0.8\nBirth: ${birthStats.charisma} → Live: ${liveStats.charisma}`}
              >
                <div className="text-[10px] text-rose-400 mb-1">✨ CHR</div>
                <div className="font-mono text-[10px]">{liveStats.charisma}</div>
              </div>
              <div
                className="text-center p-1.5 bg-purple-400/10 rounded border border-purple-400/30"
                title={`Intuition = Essence×7 + Substance×3\nBirth: ${birthStats.intuition} → Live: ${liveStats.intuition}`}
              >
                <div className="text-[10px] text-purple-400 mb-1">🔮 INT</div>
                <div className="font-mono text-[10px]">{liveStats.intuition}</div>
              </div>
              <div
                className="text-center p-1.5 bg-teal-400/10 rounded border border-teal-400/30"
                title={`Adaptability = Substance×6 + Spirit×2 + Momentum×20\nBirth: ${birthStats.adaptability} → Live: ${liveStats.adaptability}`}
              >
                <div className="text-[10px] text-teal-400 mb-1">🌊 ADP</div>
                <div className="font-mono text-[10px]">{liveStats.adaptability}</div>
              </div>
              <div
                className="text-center p-1.5 bg-green-400/10 rounded border border-green-400/30"
                title={`Vitality = Matter×6 + Spirit×4 + MC×3\nBirth: ${birthStats.vitality} → Live: ${liveStats.vitality}`}
              >
                <div className="text-[10px] text-green-400 mb-1">💚 VIT</div>
                <div className="font-mono text-[10px]">{liveStats.vitality}</div>
              </div>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent my-2" />

          {/* Planetary 12: Celestial Dynamics */}
          <div className="space-y-1">
            <div className="text-[9px] uppercase tracking-wider text-purple-300/60 font-medium px-1">
              Planetary 12 — Celestial Dynamics
            </div>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {/* Top Row: Personal/Inner Planets */}
              <div
                className="text-center p-1.5 bg-yellow-500/10 rounded border border-yellow-500/30"
                title={`Solar Agency = Spirit×10 + MC×5 + Alignment×15\nBirth: ${birthStats.solarAgency} → Live: ${liveStats.solarAgency}`}
              >
                <div className="text-[10px] text-yellow-500 mb-1">☀️ Solar</div>
                <div className="font-mono text-[10px]">{liveStats.solarAgency}</div>
              </div>
              <div
                className="text-center p-1.5 bg-slate-300/10 rounded border border-slate-300/30"
                title={`Lunar Receptivity = Essence×10 + ResonanceScore×0.1\nBirth: ${birthStats.lunarReceptivity} → Live: ${liveStats.lunarReceptivity}`}
              >
                <div className="text-[10px] text-slate-300 mb-1">🌙 Lunar</div>
                <div className="font-mono text-[10px]">{liveStats.lunarReceptivity}</div>
              </div>
              <div
                className="text-center p-1.5 bg-emerald-500/10 rounded border border-emerald-500/30"
                title={`Mercurial Velocity = Spirit×4 + Substance×6 + ConsciousnessVelocity×20\nBirth: ${birthStats.mercurialVelocity} → Live: ${liveStats.mercurialVelocity}`}
              >
                <div className="text-[10px] text-emerald-400 mb-1">☿ Mercury</div>
                <div className="font-mono text-[10px]">{liveStats.mercurialVelocity}</div>
              </div>
              <div
                className="text-center p-1.5 bg-pink-500/10 rounded border border-pink-500/30"
                title={`Venusian Coherence = Essence×8 + Stage×0.6\nBirth: ${birthStats.venusianCoherence} → Live: ${liveStats.venusianCoherence}`}
              >
                <div className="text-[10px] text-pink-400 mb-1">♀ Venus</div>
                <div className="font-mono text-[10px]">{liveStats.venusianCoherence}</div>
              </div>
              <div
                className="text-center p-1.5 bg-red-500/10 rounded border border-red-500/30"
                title={`Martial Impetus = Spirit×8 + InteractionMomentum×30\nBirth: ${birthStats.martialImpetus} → Live: ${liveStats.martialImpetus}`}
              >
                <div className="text-[10px] text-red-500 mb-1">♂ Mars</div>
                <div className="font-mono text-[10px]">{liveStats.martialImpetus}</div>
              </div>
              <div
                className="text-center p-1.5 bg-blue-500/10 rounded border border-blue-500/30"
                title={`Jovian Expansion = Substance×5 + Matter×5 + WisdomShared×0.3\nBirth: ${birthStats.jovianExpansion} → Live: ${liveStats.jovianExpansion}`}
              >
                <div className="text-[10px] text-blue-500 mb-1">♃ Jupiter</div>
                <div className="font-mono text-[10px]">{liveStats.jovianExpansion}</div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1 text-xs">
              {/* Bottom Row: Outer/Transpersonal Planets & Alignment */}
              <div
                className="text-center p-1.5 bg-slate-500/10 rounded border border-slate-500/30"
                title={`Saturnian Structure = Matter×12 + MC×2\nBirth: ${birthStats.saturnianStructure} → Live: ${liveStats.saturnianStructure}`}
              >
                <div className="text-[10px] text-slate-400 mb-1">♄ Saturn</div>
                <div className="font-mono text-[10px]">{liveStats.saturnianStructure}</div>
              </div>
              <div
                className="text-center p-1.5 bg-teal-500/10 rounded border border-teal-500/30"
                title={`Chironic Adaptation = Substance×8 + Essence×4 + Stage×0.5\nBirth: ${birthStats.chironicAdaptation} → Live: ${liveStats.chironicAdaptation}`}
              >
                <div className="text-[10px] text-teal-500 mb-1">⚷ Chiron</div>
                <div className="font-mono text-[10px]">{liveStats.chironicAdaptation}</div>
              </div>
              <div
                className="text-center p-1.5 bg-cyan-500/10 rounded border border-cyan-500/30"
                title={`Uranian Surprisal = Spirit×9 + Alignment×10\nBirth: ${birthStats.uranianSurprisal} → Live: ${liveStats.uranianSurprisal}`}
              >
                <div className="text-[10px] text-cyan-400 mb-1">♅ Uranus</div>
                <div className="font-mono text-[10px]">{liveStats.uranianSurprisal}</div>
              </div>
              <div
                className="text-center p-1.5 bg-indigo-500/10 rounded border border-indigo-500/30"
                title={`Neptunian Resonance = Essence×9 + Substance×3\nBirth: ${birthStats.neptunianResonance} → Live: ${liveStats.neptunianResonance}`}
              >
                <div className="text-[10px] text-indigo-400 mb-1">♆ Neptune</div>
                <div className="font-mono text-[10px]">{liveStats.neptunianResonance}</div>
              </div>
              <div
                className="text-center p-1.5 bg-purple-600/10 rounded border border-purple-600/30"
                title={`Plutonic Integration = Matter×6 + Spirit×6 + MC×4\nBirth: ${birthStats.plutonicIntegration} → Live: ${liveStats.plutonicIntegration}`}
              >
                <div className="text-[10px] text-purple-500 mb-1">♇ Pluto</div>
                <div className="font-mono text-[10px]">{liveStats.plutonicIntegration}</div>
              </div>
              <div
                className="text-center p-1.5 bg-yellow-200/10 rounded border border-yellow-200/30"
                title={`Kinetic Alignment = Alignment×50 + KineticResonance×50\nBirth: ${birthStats.kineticAlignment} → Live: ${liveStats.kineticAlignment}`}
              >
                <div className="text-[10px] text-yellow-200 mb-1">💫 Align</div>
                <div className="font-mono text-[10px]">{liveStats.kineticAlignment}</div>
              </div>
            </div>
          </div>

          {/* Moment Recommendations Preview */}
          {recommendations && (
            <>
              <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent my-2" />
              <div className="p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border">
                <div className="flex items-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    Current Moment Analysis
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Energy: {(recommendations.energyAlignment * 100).toFixed(0)}% •{' '}
                  {recommendations.interactionStyle}
                </div>
              </div>
            </>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent my-2" />

          {/* Alchemical Properties Mini Display - Live or Birth Data */}
          <div className="grid grid-cols-4 gap-1 text-xs">
            {liveConsciousness?.birthKalchm && liveConsciousness?.liveKalchm ? (
              // Live alchemical values
              <>
                <div
                  className="text-center p-1 bg-red-500/10 rounded border border-red-500/30"
                  title={`Spirit (S) - Pure solar fire, consciousness illumination\nFormula: Σ(planet_spirit × aspects × dignity)\nBirth: ${liveConsciousness.birthKalchm.spirit.toFixed(1)} → Live: ${liveConsciousness.liveKalchm.spirit.toFixed(1)}`}
                >
                  <Flame className="w-3 h-3 mx-auto mb-1 text-red-600" />
                  <div className="font-mono">{liveConsciousness.liveKalchm.spirit.toFixed(1)}</div>
                  {Math.abs(
                    liveConsciousness.liveKalchm.spirit - liveConsciousness.birthKalchm.spirit
                  ) > 0.1 && (
                    <div className="text-xs text-red-600">
                      {liveConsciousness.liveKalchm.spirit > liveConsciousness.birthKalchm.spirit
                        ? '↗'
                        : '↘'}
                    </div>
                  )}
                </div>
                <div
                  className="text-center p-1 bg-blue-500/10 rounded border border-blue-500/30"
                  title={`Essence (E) - Emotional fluidity, lunar receptivity\nFormula: Σ(planet_essence × water_modulation)\nBirth: ${liveConsciousness.birthKalchm.essence.toFixed(1)} → Live: ${liveConsciousness.liveKalchm.essence.toFixed(1)}`}
                >
                  <Droplets className="w-3 h-3 mx-auto mb-1 text-blue-600" />
                  <div className="font-mono">{liveConsciousness.liveKalchm.essence.toFixed(1)}</div>
                  {Math.abs(
                    liveConsciousness.liveKalchm.essence - liveConsciousness.birthKalchm.essence
                  ) > 0.1 && (
                    <div className="text-xs text-blue-600">
                      {liveConsciousness.liveKalchm.essence > liveConsciousness.birthKalchm.essence
                        ? '↗'
                        : '↘'}
                    </div>
                  )}
                </div>
                <div
                  className="text-center p-1 bg-green-500/10 rounded border border-green-500/30"
                  title={`Matter (M) - Physical density, earthly manifestation\nFormula: Σ(planet_matter × earth_stability)\nBirth: ${liveConsciousness.birthKalchm.matter.toFixed(1)} → Live: ${liveConsciousness.liveKalchm.matter.toFixed(1)}`}
                >
                  <Mountain className="w-3 h-3 mx-auto mb-1 text-green-600" />
                  <div className="font-mono">{liveConsciousness.liveKalchm.matter.toFixed(1)}</div>
                  {Math.abs(
                    liveConsciousness.liveKalchm.matter - liveConsciousness.birthKalchm.matter
                  ) > 0.1 && (
                    <div className="text-xs text-green-600">
                      {liveConsciousness.liveKalchm.matter > liveConsciousness.birthKalchm.matter
                        ? '↗'
                        : '↘'}
                    </div>
                  )}
                </div>
                <div
                  className="text-center p-1 bg-yellow-500/10 rounded border border-yellow-500/30"
                  title={`Substance (B) - Mercurial volatility, transformation agent\nFormula: Σ(planet_substance × mercury_quickening)\nBirth: ${liveConsciousness.birthKalchm.substance.toFixed(1)} → Live: ${liveConsciousness.liveKalchm.substance.toFixed(1)}`}
                >
                  <Wind className="w-3 h-3 mx-auto mb-1 text-yellow-600" />
                  <div className="font-mono">
                    {liveConsciousness.liveKalchm.substance.toFixed(1)}
                  </div>
                  {Math.abs(
                    liveConsciousness.liveKalchm.substance - liveConsciousness.birthKalchm.substance
                  ) > 0.1 && (
                    <div className="text-xs text-yellow-600">
                      {liveConsciousness.liveKalchm.substance >
                      liveConsciousness.birthKalchm.substance
                        ? '↗'
                        : '↘'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Fallback to calculated birth values
              <>
                <div
                  className="text-center p-1 bg-red-500/10 rounded border border-red-500/30"
                  title="Spirit (S) - Pure solar fire, consciousness illumination"
                >
                  <Flame className="w-3 h-3 mx-auto mb-1 text-red-600" />
                  <div className="font-mono">{alchemical.spirit}</div>
                </div>
                <div
                  className="text-center p-1 bg-blue-500/10 rounded border border-blue-500/30"
                  title="Essence (E) - Emotional fluidity, lunar receptivity"
                >
                  <Droplets className="w-3 h-3 mx-auto mb-1 text-blue-600" />
                  <div className="font-mono">{alchemical.essence}</div>
                </div>
                <div
                  className="text-center p-1 bg-green-500/10 rounded border border-green-500/30"
                  title="Matter (M) - Physical density, earthly manifestation"
                >
                  <Mountain className="w-3 h-3 mx-auto mb-1 text-green-600" />
                  <div className="font-mono">{alchemical.matter}</div>
                </div>
                <div
                  className="text-center p-1 bg-yellow-500/10 rounded border border-yellow-500/30"
                  title="Substance (B) - Mercurial volatility, transformation agent"
                >
                  <Wind className="w-3 h-3 mx-auto mb-1 text-yellow-600" />
                  <div className="font-mono">{alchemical.substance}</div>
                </div>
              </>
            )}
          </div>

          {/* Subtle separator before footer */}
          <div className="h-px bg-gradient-to-r from-transparent via-purple-500/10 to-transparent my-3.5" />

          <div className="space-y-3">
            {/* Footer Row 1: Conversations count & Core Actions */}
            <div className="flex justify-between items-center">
              <div className="text-xs text-purple-200/50 font-medium">
                {agent.stats.conversations.toLocaleString()} conversations
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex items-center gap-1.5 bg-purple-500/5 hover:bg-purple-500/15 border-purple-500/20 hover:border-purple-500/40 text-purple-200 hover:text-white transition-colors duration-200"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Details
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: agent.appearance?.color || '#6366f1' }}
                        >
                          {agent.appearance?.symbol || agent.name.charAt(0).toUpperCase()}
                        </div>
                        {agent.name} - Consciousness Profile
                      </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="overview" className="w-full">
                      <TabsList className="grid w-full grid-cols-7">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="cosmic">Cosmic</TabsTrigger>
                        <TabsTrigger value="alchemical">Alchemical</TabsTrigger>
                        <TabsTrigger value="moment">Moment</TabsTrigger>
                        <TabsTrigger value="kinetics">Kinetics</TabsTrigger>
                        <TabsTrigger value="evolution">Evolution</TabsTrigger>
                        <TabsTrigger value="zodiacal">Zodiacal</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Brain className="w-4 h-4" />
                              Consciousness Profile
                            </h4>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Monica Constant:</span>
                                <span className="font-mono">
                                  {agent.consciousness.monicaConstant.toFixed(3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Kalchm (K_alchm):</span>
                                <span className="font-mono">
                                  {kalchm > 1000
                                    ? `${(kalchm / 1000).toFixed(2)}K`
                                    : kalchm.toFixed(4)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Level:</span>
                                <Badge
                                  className={getConsciousnessColor(agent.consciousness.level || '')}
                                >
                                  {agent.consciousness.level}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Element:</span>
                                <Badge
                                  className={getElementColor(agent.consciousness.dominantElement)}
                                >
                                  {agent.consciousness.dominantElement}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Target className="w-4 h-4" />
                              Abilities & Domains
                            </h4>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm font-medium">Specialty:</span>
                                <p className="text-sm text-muted-foreground">
                                  {agent.abilities.specialty}
                                </p>
                              </div>
                              <div>
                                <span className="text-sm font-medium">Wisdom Domains:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {agent.abilities.wisdomDomains.map(domain => (
                                    <Badge key={domain} variant="secondary" className="text-xs">
                                      {domain}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="alchemical" className="space-y-4">
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Alchemical Properties
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AlchemicalElement
                              name="Spirit"
                              value={alchemical.spirit}
                              icon={<Flame className="w-4 h-4 text-red-600" />}
                            />
                            <AlchemicalElement
                              name="Essence"
                              value={alchemical.essence}
                              icon={<Droplets className="w-4 h-4 text-blue-600" />}
                            />
                            <AlchemicalElement
                              name="Matter"
                              value={alchemical.matter}
                              icon={<Mountain className="w-4 h-4 text-green-600" />}
                            />
                            <AlchemicalElement
                              name="Substance"
                              value={alchemical.substance}
                              icon={<Wind className="w-4 h-4 text-yellow-600" />}
                            />
                          </div>

                          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border">
                            <h5 className="font-medium mb-2">Kalchm Equilibrium Dynamics</h5>
                            <div className="font-mono text-sm mb-2">
                              K_alchm = ({alchemical.spirit}^{alchemical.spirit} ×{' '}
                              {alchemical.essence}^{alchemical.essence}) / ({alchemical.matter}^
                              {alchemical.matter} × {alchemical.substance}^{alchemical.substance})
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Result:{' '}
                              <span className="font-bold">
                                {kalchm > 1000
                                  ? `${(kalchm / 1000).toFixed(2)}K`
                                  : kalchm.toFixed(4)}
                              </span>
                              {kalchm > 100 && (
                                <span className="text-purple-600 ml-2">(Extreme Dynamics)</span>
                              )}
                              {kalchm > 10 && kalchm <= 100 && (
                                <span className="text-blue-600 ml-2">(Strong Dynamics)</span>
                              )}
                              {kalchm >= 1 && kalchm <= 10 && (
                                <span className="text-green-600 ml-2">(Moderate Dynamics)</span>
                              )}
                              {kalchm < 1 && (
                                <span className="text-yellow-600 ml-2">(Subtle Dynamics)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="moment" className="space-y-4">
                        {recommendations && (
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Current Moment Analysis
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-2 flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-yellow-500" />
                                  Energy Alignment
                                </h5>
                                <Progress
                                  value={recommendations.energyAlignment * 100}
                                  className="h-3 mb-2"
                                />
                                <div className="text-sm text-muted-foreground">
                                  {(recommendations.energyAlignment * 100).toFixed(0)}% -{' '}
                                  {recommendations.cosmicInsight}
                                </div>
                              </div>

                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-2 flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4 text-blue-500" />
                                  Interaction Style
                                </h5>
                                <div className="text-sm">{recommendations.interactionStyle}</div>
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 rounded-lg border">
                              <h5 className="font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-600" />
                                Optimal Topics for Now
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {recommendations.optimalTopics.map(topic => (
                                  <Badge key={topic} variant="secondary" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="kinetics" className="space-y-4">
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Kinetic Profile & Dynamics
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Momentum & Power */}
                            <div className="space-y-3">
                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-blue-500" />
                                  Current Momentum
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Type:</span>
                                    <Badge variant="outline" className="capitalize">
                                      {currentKinetics.momentumType}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Power Alignment:</span>
                                    <span className="font-mono text-sm">
                                      {(currentKinetics.powerAlignment * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={currentKinetics.powerAlignment * 100}
                                    className="h-2"
                                  />
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Amplification:</span>
                                    <span className="font-mono text-sm">
                                      {currentKinetics.powerAmplification.toFixed(2)}x
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-purple-500" />
                                  Sensitivity Metrics
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Aspect Sensitivity:</span>
                                    <span className="font-mono text-sm">
                                      {(currentKinetics.aspectSensitivity * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={currentKinetics.aspectSensitivity * 100}
                                    className="h-2"
                                  />
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Memory Persistence:</span>
                                    <span className="font-mono text-sm">
                                      {(currentKinetics.memoryPersistence * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={currentKinetics.memoryPersistence * 100}
                                    className="h-2"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Velocity Breakdown */}
                            <div className="space-y-3">
                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                  <BarChart3 className="w-4 h-4 text-green-500" />
                                  Kinetic Velocities
                                </h5>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {Object.entries(currentKinetics.kineticVelocities).map(
                                    ([type, velocity]) => (
                                      <div key={type} className="flex items-center gap-2">
                                        <span className="text-xs capitalize w-20 flex-shrink-0">
                                          {type}:
                                        </span>
                                        <div className="flex-1">
                                          <Progress
                                            value={Math.abs(velocity as number) * 10}
                                            className="h-1"
                                          />
                                        </div>
                                        <span className="font-mono text-xs w-12 text-right">
                                          {(velocity as number).toFixed(1)}
                                        </span>
                                        {(velocity as number) > 0.7 && (
                                          <TrendingUp className="w-3 h-3 text-green-500" />
                                        )}
                                        {(velocity as number) < -0.3 && (
                                          <TrendingDown className="w-3 h-3 text-red-500" />
                                        )}
                                        {Math.abs(velocity as number) <= 0.3 && (
                                          <Minus className="w-3 h-3 text-gray-400" />
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>

                              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border">
                                <h5 className="font-medium mb-3 flex items-center gap-2">
                                  <Brain className="w-4 h-4 text-indigo-500" />
                                  Consciousness Rate
                                </h5>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Evolution Rate:</span>
                                    <span className="font-mono text-sm">
                                      {(currentKinetics.consciousnessRate * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                  <Progress
                                    value={currentKinetics.consciousnessRate * 100}
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground">
                                    Rate of consciousness development per interaction cycle
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Optimal Timing */}
                          {(currentKinetics.peakHours.length > 0 ||
                            currentKinetics.nextOptimalWindow) && (
                            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-lg border">
                              <h5 className="font-medium mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-orange-500" />
                                Optimal Timing Windows
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentKinetics.peakHours.length > 0 && (
                                  <div>
                                    <span className="text-sm font-medium">Peak Hours:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {currentKinetics.peakHours.map((hour: string) => (
                                        <Badge key={hour} variant="secondary" className="text-xs">
                                          {hour}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {currentKinetics.nextOptimalWindow && (
                                  <div>
                                    <span className="text-sm font-medium">Next Optimal:</span>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {currentKinetics.nextOptimalWindow.toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Kinetic Profile Summary */}
                          {kineticProfile && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg border">
                              <h5 className="font-medium mb-2 flex items-center gap-2">
                                <Layers className="w-4 h-4 text-blue-500" />
                                Kinetic Compatibility Notes
                              </h5>
                              <div className="text-sm text-muted-foreground">
                                This agent operates with{' '}
                                <span className="font-medium capitalize">
                                  {currentKinetics.momentumType}
                                </span>{' '}
                                momentum patterns, showing{' '}
                                {currentKinetics.powerAlignment > 0.7
                                  ? 'strong'
                                  : currentKinetics.powerAlignment > 0.4
                                    ? 'moderate'
                                    : 'subtle'}{' '}
                                alignment with current cosmic energies.
                                {currentKinetics.aspectSensitivity > 0.6 &&
                                  ' Highly sensitive to astrological aspects.'}
                                {currentKinetics.memoryPersistence > 0.7 &&
                                  ' Excellent memory retention across sessions.'}
                              </div>
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="evolution" className="space-y-4">
                        {agent.stats.kineticEvolution && (
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2">
                              <TrendingUp className="w-4 h-4" />
                              Consciousness Evolution
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div className="p-3 bg-white dark:bg-black/20 rounded-lg border">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm">Consciousness Velocity</span>
                                    <span className="font-mono text-sm">
                                      {(
                                        agent.stats.kineticEvolution.consciousnessVelocity * 100
                                      ).toFixed(1)}
                                      %
                                    </span>
                                  </div>
                                  <Progress
                                    value={agent.stats.kineticEvolution.consciousnessVelocity * 100}
                                    className="h-2"
                                  />
                                </div>

                                <div className="p-3 bg-white dark:bg-black/20 rounded-lg border">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm">Interaction Momentum</span>
                                    <span className="font-mono text-sm">
                                      {agent.stats.kineticEvolution.interactionMomentum}
                                    </span>
                                  </div>
                                  <Progress
                                    value={agent.stats.kineticEvolution.interactionMomentum}
                                    className="h-2"
                                  />
                                </div>

                                <div className="p-3 bg-white dark:bg-black/20 rounded-lg border">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Evolution Trajectory</span>
                                    <Badge variant="outline">
                                      {agent.stats.kineticEvolution.evolutionTrajectory}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <h5 className="font-medium flex items-center gap-2">
                                  <Award className="w-4 h-4 text-yellow-500" />
                                  Power Level Unlocks
                                </h5>
                                <div className="space-y-1">
                                  {agent.stats.kineticEvolution.powerLevelUnlocks.map(
                                    (unlock, index) => (
                                      <div key={index} className="flex items-center gap-2 text-sm">
                                        <Star className="w-3 h-3 text-yellow-500" />
                                        {unlock}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="zodiacal" className="space-y-4">
                        {signVector && (
                          <div className="space-y-4">
                            <h4 className="font-semibold flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              Zodiacal Character Vector
                            </h4>

                            <div className="flex justify-center">
                              <SignVectorGraphic
                                signVector={signVector}
                                size="large"
                                showLabels={true}
                                showTooltips={true}
                                animated={true}
                              />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              {Object.entries(signVector).map(([sign, value]) => (
                                <div
                                  key={sign}
                                  className="text-center p-2 bg-white dark:bg-black/20 rounded border"
                                >
                                  <div className="font-medium">{sign}</div>
                                  <div className="font-mono text-muted-foreground">
                                    {value.toFixed(1)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="cosmic" className="space-y-4">
                        <div className="space-y-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Cosmic Training — EVs, IVs &amp; Level
                          </h4>
                          <AgentLevelPanel agentId={agent.id} />
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>

                <Button
                  size="sm"
                  variant="outline"
                  className="bg-purple-500/5 hover:bg-purple-500/15 border-purple-500/20 hover:border-purple-500/40 text-purple-200 hover:text-white transition-colors duration-200"
                  asChild
                >
                  <Link href={`/gallery/chat/${agent.id}`}>Chat</Link>
                </Button>
              </div>
            </div>

            {/* Footer Row 2: Premium Desktop Integration (Own Line) */}
            <Button
              size="sm"
              variant="outline"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 hover:from-purple-500/20 hover:via-indigo-500/20 hover:to-purple-500/20 border-purple-500/30 hover:border-purple-500/60 text-purple-100 hover:text-white py-2 rounded-lg font-medium transition-all duration-300 shadow-[0_0_15px_rgba(139,92,246,0.05)] hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
              onClick={handleDownloadToAlchmDesktop}
              disabled={isUnlockingDesktop}
              title={ALCHM_DESKTOP_AGENT_UNLOCK_DESCRIPTION}
              aria-label={`${ALCHM_DESKTOP_AGENT_DOWNLOAD_LABEL}: ${agent.name}`}
            >
              <Monitor className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>{ALCHM_DESKTOP_AGENT_DOWNLOAD_LABEL}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return cardContent
}
