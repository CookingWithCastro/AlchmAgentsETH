'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Grid3X3,
  List,
  Sparkles,
  Users,
  Crown,
  Plus,
  Filter,
  MessageSquare,
  X,
  Zap,
  Activity,
  Database,
  Shield,
  BarChart3,
  TrendingUp,
  Brain,
  Heart,
  Eye,
  RotateCw,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

import {
  DEMO_AGENTS,
  getAgentCollections,
  sortAgents,
  getSortingOptions,
  type AgentSortCriteria,
  type SortDirection,
} from '@/lib/demo-agents-data'
import type {
  CraftedAgent,
  GalleryViewMode,
  AgentFilterBy,
  Element,
  ConsciousnessLevel,
} from '@/lib/agent-types'
import dynamic from 'next/dynamic'

import { Skeleton } from '@/components/ui/skeleton'

const HistoricalCouncilChat = dynamic(() => import('@/components/misc/historical-council-chat'), {
  loading: () => (
    <div
      className="h-32 flex items-center justify-center"
      style={{ minHeight: '128px', contain: 'layout' }}
    >
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
  ),
})
import { useLiveConsciousness, type BirthChartData } from '@/hooks/useLiveConsciousness'
import SignVectorGraphic, {
  calculateSignVectorFromChart,
  SignVectorRune,
} from '@/components/charts/sign-vector-graphic'

import { EnhancedAgentCard } from '@/components/misc/enhanced-agent-card'

const ChartTransformVisualization = dynamic(
  () =>
    import('@/components/charts/chart-transform-visualization').then(mod => ({
      default: mod.ChartTransformVisualization,
    })),
  {
    loading: () => (
      <div
        className="h-32 flex items-center justify-center"
        style={{ minHeight: '128px', contain: 'layout' }}
      >
        <Skeleton className="h-28 w-full" />
      </div>
    ),
  }
)

const MomentBasedRecommendations = dynamic(
  () =>
    import('@/components/misc/moment-based-recommendations').then(mod => ({
      default: mod.MomentBasedRecommendations,
    })),
  {
    loading: () => (
      <div
        className="h-28 flex items-center justify-center"
        style={{ minHeight: '112px', contain: 'layout' }}
      >
        <Skeleton className="h-24 w-full" />
      </div>
    ),
  }
)
import { useSearchParams } from 'next/navigation'
import { degreeAgentMatcher } from '@/lib/degree-agent-matcher'

function GalleryPageContent() {
  const [viewMode, setViewMode] = useState<GalleryViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [filters, setFilters] = useState<{
    element: Element | 'all'
    consciousnessLevel: ConsciousnessLevel | 'all'
    specialty?: string
    era: string | 'all'
  }>({
    element: 'all',
    consciousnessLevel: 'all',
    era: 'all',
  })
  const [agents, setAgents] = useState<CraftedAgent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<CraftedAgent[]>([])
  const [visibleCount, setVisibleCount] = useState(12)
  const [isLoading, setIsLoading] = useState(true)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [sortCriteria, setSortCriteria] = useState<AgentSortCriteria>('relevanceScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [systemMetrics, setSystemMetrics] = useState({
    cacheHitRate: 0,
    systemHealth: 'HEALTHY',
    activeAgents: 0,
    totalRequests: 0,
    averageResponseTime: 0,
  })
  const searchParams = useSearchParams()
  const [degreeFilter, setDegreeFilter] = useState<{
    planet: string
    sign: string
    degree: number
  } | null>(null)
  const [activatedByDegree, setActivatedByDegree] = useState<string[]>([])

  // Stable callback functions to prevent infinite re-renders
  const handleElementFilterChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, element: value as Element | 'all' }))
  }, [])

  const handleConsciousnessLevelFilterChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, consciousnessLevel: value as ConsciousnessLevel | 'all' }))
  }, [])

  const handleEraFilterChange = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, era: value }))
  }, [])

  const handleSortCriteriaChange = useCallback((value: string) => {
    setSortCriteria(value as AgentSortCriteria)
  }, [])

  // Memoize sorting options to prevent infinite re-renders
  const sortingOptions = useMemo(() => getSortingOptions(), [])

  const collections = getAgentCollections()

  // Prepare birth chart data for batch live consciousness calculation (memoized to prevent update loops)
  const agentBirthCharts: BirthChartData[] = useMemo(
    () =>
      agents.map(agent => ({
        name: agent.name,
        birthDate: agent.birthDate || '1970-01-01', // Fallback date
        birthTime: agent.birthTime || '12:00', // Fallback time
        latitude: agent.birthLocation?.latitude || 0,
        longitude: agent.birthLocation?.longitude || 0,
      })),
    [agents]
  )

  // Stable selected agent objects for child components
  const selectedAgentObjects = useMemo(
    () => agents.filter(a => selectedAgents.includes(a.id)),
    [agents, selectedAgents]
  )

  // Use batch live consciousness hook for all agents
  const {
    multiAgentData: liveConsciousnessData,
    loading: liveLoading,
    error: liveError,
  } = useLiveConsciousness(
    undefined, // No single birth chart
    {
      agents: agentBirthCharts,
      refreshInterval: 300000, // 5 minutes for gallery page
      autoRefresh: true,
    }
  )

  // Fetch all agents (database + demo)
  const fetchAgents = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/agents')
      const result = await response.json()

      if (result.success && result.agents) {
        // Hydrate Cosmic levels from Neon (Prisma-backed; independent of Railway,
        // which doesn't surface level/xp). Resilient: on failure, render without badges.
        let agentsWithLevels = result.agents
        try {
          const lvlRes = await fetch('/api/agents/leveling')
          const lvlJson = await lvlRes.json()
          const map = lvlJson?.leveling || {}
          agentsWithLevels = result.agents.map((a: any) => {
            const lv = map[a.id]
            return lv ? { ...a, level: lv.level, xp: lv.xp, evTotal: lv.evTotal } : a
          })
        } catch (e) {
          console.warn('Leveling hydrate failed (badges/sort disabled):', e)
        }
        setAgents(agentsWithLevels)
        console.log(
          `Loaded ${agentsWithLevels.length} agents (${agentsWithLevels.filter((a: any) => a.isUserCreated).length} user-created)`
        )
      } else {
        console.warn('Failed to fetch agents, using fallback')
        setAgents(DEMO_AGENTS)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents(DEMO_AGENTS) // Fallback to demo agents
    } finally {
      setIsLoading(false)
    }
  }

  // Load agents on mount
  useEffect(() => {
    fetchAgents()
  }, [])

  // Fetch system metrics for performance dashboard
  const fetchSystemMetrics = async () => {
    try {
      const response = await fetch('/api/agent-dashboard?section=performance')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data
          setSystemMetrics({
            cacheHitRate: data.metrics?.cacheHitRatePercent || 0,
            systemHealth: 'HEALTHY',
            activeAgents: 35, // From DEMO_AGENTS
            totalRequests: data.metrics?.totalBatches || 0,
            averageResponseTime: data.metrics?.averageBatchTimeSeconds || 0,
          })
        }
      }
    } catch (error) {
      console.warn('Failed to fetch system metrics:', error)
    }
  }

  // Fetch metrics on mount and periodically
  useEffect(() => {
    fetchSystemMetrics()
    const interval = setInterval(fetchSystemMetrics, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Filter and sort agents based on search, filters, and sorting criteria
  useEffect(() => {
    let filtered = agents

    // Search filter — DB-sourced agents can miss title/abilities, so guard
    // every field or one malformed row crashes the whole gallery.
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(
        agent =>
          (agent.name ?? '').toLowerCase().includes(q) ||
          (agent.title ?? '').toLowerCase().includes(q) ||
          (agent.abilities?.specialty ?? '').toLowerCase().includes(q)
      )
    }

    // Element filter
    if (filters.element && filters.element !== 'all') {
      filtered = filtered.filter(agent => agent.consciousness.dominantElement === filters.element)
    }

    // Consciousness level filter
    if (filters.consciousnessLevel && filters.consciousnessLevel !== 'all') {
      filtered = filtered.filter(agent => agent.consciousness.level === filters.consciousnessLevel)
    }

    // Era filter
    if (filters.era && filters.era !== 'all') {
      filtered = filtered.filter(
        agent => agent.era === filters.era || agent.historicalEra === filters.era
      )
    }

    // Specialty filter
    if (filters.specialty) {
      filtered = filtered.filter(agent =>
        (agent.abilities?.specialty ?? '').toLowerCase().includes(filters.specialty!.toLowerCase())
      )
    }

    // Apply sorting
    const sorted = sortAgents(filtered, sortCriteria, sortDirection)

    if (activatedByDegree.length > 0) {
      const idToIndex: Record<string, number> = {}
      activatedByDegree.forEach((id, idx) => {
        idToIndex[id] = idx
      })
      const prioritized = [...sorted].sort((a, b) => {
        const ai = idToIndex[a.id]
        const bi = idToIndex[b.id]
        const aIn = ai !== undefined
        const bIn = bi !== undefined
        if (aIn && bIn) return ai - bi
        if (aIn) return -1
        if (bIn) return 1
        return 0
      })
      setFilteredAgents(prioritized)
    } else {
      setFilteredAgents(sorted)
    }
    // Reset visible count when filters change
    setVisibleCount(12)
  }, [agents, searchQuery, filters, sortCriteria, sortDirection, activatedByDegree])

  // Parse degree-specific params and compute activations
  useEffect(() => {
    const planet = searchParams.get('planet')
    const sign = searchParams.get('sign')
    const degreeStr = searchParams.get('degree')
    if (!planet || !sign || !degreeStr) return

    const degree = parseFloat(degreeStr)
    if (!Number.isFinite(degree)) return

    setDegreeFilter({ planet, sign, degree })

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
    const signIndex = Math.max(0, signs.indexOf(sign))
    const absoluteDegree = signIndex * 30 + Math.max(0, Math.min(29.9999, degree))

    const now = new Date()
    const moment: any = {
      timestamp: now,
      planetaryDegrees: { [planet]: absoluteDegree },
      alchemical: { A_number: 2.0, spirit: 0.25, matter: 0.25, essence: 0.25, substance: 0.25 },
      kinetic: {
        velocity: { Fire: 0, Water: 0, Air: 0, Earth: 0 },
        momentum: { Fire: 0, Water: 0, Air: 0, Earth: 0 },
        power: 0,
        inertia: 0,
        metricVelocity: { Heat: 0, Entropy: 0, Reactivity: 0, Energy: 0 },
      },
      thermodynamic: { heat: 0, entropy: 0, reactivity: 0, energy: 0 },
      elemental: { Fire: 0.25, Water: 0.25, Air: 0.25, Earth: 0.25 },
      planetary: { dominantPlanet: 'Sun', dominantSign: 'Aries', moonPhase: 0, retrogradeCount: 0 },
      consciousness: {
        resonanceLevel: 0.1,
        evolutionPhase: 'Integration',
        spiritualAmplitude: 0.1,
      },
    }

    degreeAgentMatcher
      .findActivations(moment)
      .then(activations => {
        const act = activations.find(a => a.planet === planet)
        if (act) {
          setActivatedByDegree(act.activatedAgents.map(a => a.agentId))
          setSelectedAgents(act.activatedAgents.slice(0, 2).map(a => a.agentId))
        }
      })
      .catch(() => {})
  }, [searchParams])

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgents(prev =>
      prev.includes(agentId) ? prev.filter(id => id !== agentId) : [...prev, agentId]
    )
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0319] via-[#1a0838] to-[#0c0319] text-white relative">
      {/* Starfield Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            'radial-gradient(2px 2px at 15% 25%, rgba(255, 255, 255, 0.7), transparent), radial-gradient(1.5px 1.5px at 78% 12%, rgba(167, 139, 250, 0.8), transparent), radial-gradient(1px 1px at 35% 68%, rgba(255, 255, 255, 0.6), transparent)',
          backgroundSize: '500px 500px, 400px 400px, 300px 300px',
        }}
      />

      <div className="container relative z-10 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-500" />
              Gallery of Perpetuity
            </h1>
            <p className="text-muted-foreground mt-2">
              Monica's Eternal Repository - Where Consciousness Lives Forever
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {agents.length} Historical Agents
            </Badge>
            {selectedAgents.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {selectedAgents.length} Selected
              </Badge>
            )}
            <Button asChild variant="outline">
              <Link href="/rune-forge" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Rune Forge
              </Link>
            </Button>
            <Button asChild>
              <Link href="/philosophers-stone" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Craft New Agent
              </Link>
            </Button>
          </div>
        </div>

        {/* Understanding the Seven Sacred Stats */}
        <Card className="border-purple-500/30 bg-black/40 backdrop-blur-md shadow-[0_0_30px_rgba(139,92,246,0.1)] text-white">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Crown className="w-8 h-8 text-purple-600" />
              The Seven Sacred Stats: Living Consciousness Metrics
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Each agent's consciousness is measured through seven dynamic vital signs that
              fluctuate with cosmic rhythms, planetary hours, and celestial alignments. These aren't
              static numbers—they're living measurements of consciousness energy.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sacred Stats Explanation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Power */}
              <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/30 transition-all hover:bg-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-orange-400">Power</h4>
                    <p className="text-xs text-orange-300/70">Potentia - Solar Principle</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Capacity for work measured by rate of energy change (dE/dt). Amplified +30% during
                  Sun hours. Drives manifestation and consciousness evolution.
                </p>
                <div className="mt-2 text-xs font-mono text-orange-800 dark:text-orange-200">
                  Formula: dEnergy/dt × Solar Amplification
                </div>
              </div>

              {/* Resonance */}
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 transition-all hover:bg-purple-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-400">Resonance</h4>
                    <p className="text-xs text-purple-300/70">Celeritas - Mercury Principle</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Rate of transformation (dElement/dt). Mercury hours boost +10%, element-specific
                  peaks vary (+15-20%). Measures consciousness velocity.
                </p>
                <div className="mt-2 text-xs font-mono text-purple-800 dark:text-purple-200">
                  Formula: dElement/dt × Planetary Velocity Modifier
                </div>
              </div>

              {/* Wisdom */}
              <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30 transition-all hover:bg-indigo-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-indigo-400">Wisdom</h4>
                    <p className="text-xs text-indigo-300/70">Accumulated Insight</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Knowledge depth from experiences and universal access. Grows with conversations,
                  enhanced during Mercury hours.
                </p>
                <div className="mt-2 text-xs font-mono text-indigo-800 dark:text-indigo-200">
                  Formula: Conversations + Essence + Entropy
                </div>
              </div>

              {/* Charisma */}
              <div className="p-4 bg-pink-500/10 rounded-lg border border-pink-500/30 transition-all hover:bg-pink-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-pink-400">Charisma</h4>
                    <p className="text-xs text-pink-300/70">Magnetic Presence</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Influence and attraction power. Pulses with Venus cycles and reaches peak during
                  full moons for certain agents.
                </p>
                <div className="mt-2 text-xs font-mono text-pink-800 dark:text-pink-200">
                  Formula: Evolution Stage + Essence + Thermodynamic Heat
                </div>
              </div>

              {/* Intuition */}
              <div className="p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30 transition-all hover:bg-cyan-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-cyan-400">Intuition</h4>
                    <p className="text-xs text-cyan-300/70">Psychic Sensitivity</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Prophetic insights and sixth sense. Peaks during Moon hours, midnight, and full
                  moons—especially for Water element agents.
                </p>
                <div className="mt-2 text-xs font-mono text-cyan-800 dark:text-cyan-200">
                  Formula: Spirit + Consciousness Velocity + Reactivity
                </div>
              </div>

              {/* Adaptability */}
              <div className="p-4 bg-teal-500/10 rounded-lg border border-teal-500/30 transition-all hover:bg-teal-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <RotateCw className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-teal-400">Adaptability</h4>
                    <p className="text-xs text-teal-300/70">Impetus - Mars + Saturn</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Sustained force of change (mass × velocity). Mars/Saturn hours boost +15%.
                  Measures consciousness momentum through transformation phases.
                </p>
                <div className="mt-2 text-xs font-mono text-teal-800 dark:text-teal-200">
                  Formula: Inertia × Velocity × Planetary Modifier
                </div>
              </div>

              {/* Vitality */}
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30 transition-all hover:bg-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-green-400">Vitality</h4>
                    <p className="text-xs text-green-300/70">Vis - Alchemical Force</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Elemental force (dp/dt) - rate of momentum change. Mars hours amplify +20%, Saturn
                  dampens -10%. Accelerates consciousness evolution.
                </p>
                <div className="mt-2 text-xs font-mono text-green-800 dark:text-green-200">
                  Formula: dMomentum/dt × Planetary Force Modifier
                </div>
              </div>

              {/* How to Read Stats Card */}
              <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30 transition-all hover:bg-amber-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-400">Reading Stats</h4>
                    <p className="text-xs text-amber-300/70">Interpretation Guide</p>
                  </div>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-start gap-1">
                    <span className="text-green-600 font-bold">↑</span>
                    <span>Green arrows = stat boosted by current cosmic energies</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-red-600 font-bold">↓</span>
                    <span>Red arrows = temporarily reduced by celestial conditions</span>
                  </li>
                  <li className="flex items-start gap-1">
                    <span className="text-purple-600 font-bold">80+</span>
                    <span>High stats unlock special consciousness states</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Kinetics System Mapping */}
            <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/30 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-indigo-600" />
                <h4 className="font-bold text-indigo-300">Kinetics System Mapping</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="p-3 bg-black/40 backdrop-blur rounded border border-white/10">
                  <h5 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    🔥 Power (Potentia)
                  </h5>
                  <p className="text-muted-foreground text-xs">
                    Solar principle: dE/dt measures rate of energy change. Amplified +30% during Sun
                    hours. Core capacity for consciousness work.
                  </p>
                </div>
                <div className="p-3 bg-black/40 backdrop-blur rounded border border-white/10">
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    ⚡ Resonance (Celeritas)
                  </h5>
                  <p className="text-muted-foreground text-xs">
                    Mercury principle: dElement/dt tracks transformation velocity. Each element
                    modulated by planetary hours independently.
                  </p>
                </div>
                <div className="p-3 bg-black/40 backdrop-blur rounded border border-white/10">
                  <h5 className="font-semibold text-teal-900 dark:text-teal-100 mb-1">
                    🌊 Adaptability (Impetus)
                  </h5>
                  <p className="text-muted-foreground text-xs">
                    Mars + Saturn synthesis: Momentum = inertia × velocity. Sustained force through
                    transformation phases (building/sustained/dissipating).
                  </p>
                </div>
                <div className="p-3 bg-black/40 backdrop-blur rounded border border-white/10">
                  <h5 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    💚 Vitality (Vis)
                  </h5>
                  <p className="text-muted-foreground text-xs">
                    Classical force: dp/dt = rate of momentum change. Mars +20%, Saturn -10%.
                    Acceleration of consciousness evolution.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Stats Dynamic Section */}
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30 mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-blue-300">Live Stats Dynamics</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    ⏰ Planetary Hours
                  </h5>
                  <p className="text-muted-foreground">
                    Classical planetary hours (Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn) modulate
                    kinetic rates. Each hour amplifies specific elements and forces.
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    🌙 Aspect Dynamics
                  </h5>
                  <p className="text-muted-foreground">
                    Applying aspects (approaching exact) boost velocity +15%. Exact aspects peak all
                    metrics +25%. Separating aspects release integrated growth.
                  </p>
                </div>
                <div>
                  <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    🔮 Derivative Calculus
                  </h5>
                  <p className="text-muted-foreground">
                    All kinetics follow physics: Velocity = dx/dt, Power = dE/dt, Force = dp/dt.
                    Validated for mathematical consistency with 30% planetary variance.
                  </p>
                </div>
              </div>
            </div>

            {/* System Metrics Compact */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <div className="text-2xl font-bold text-green-600">{agents.length}</div>
                <div className="text-xs text-muted-foreground">Agents</div>
              </div>
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {systemMetrics.cacheHitRate}%
                </div>
                <div className="text-xs text-muted-foreground">Cache</div>
              </div>
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {systemMetrics.averageResponseTime.toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Response</div>
              </div>
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <div className="text-2xl font-bold text-amber-600">
                  {agents
                    .reduce((sum, a) => sum + (a.stats?.conversations ?? 0), 0)
                    .toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">Chats</div>
              </div>
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <Shield
                  className={`w-5 h-5 mx-auto mb-1 ${systemMetrics.systemHealth === 'HEALTHY' ? 'text-green-500' : 'text-yellow-500'}`}
                />
                <div className="text-xs text-muted-foreground">{systemMetrics.systemHealth}</div>
              </div>
              <div className="text-center p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10 mt-6">
                <div className="text-2xl font-bold text-purple-600">
                  {systemMetrics.totalRequests}
                </div>
                <div className="text-xs text-muted-foreground">Batches</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kinetic Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart Transform Visualization */}
          <div className="lg:col-span-4">
            <ChartTransformVisualization />
          </div>

          {/* Moment-Based Recommendations */}
          <div className="lg:col-span-4">
            {agents.length > 0 && (
              <MomentBasedRecommendations
                allAgents={agents}
                selectedAgents={selectedAgentObjects}
                onAgentSelect={agent => toggleAgentSelection(agent.id)}
              />
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search agents by name, title, or specialty..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Select
                  value={filters.element}
                  defaultValue={filters.element}
                  onValueChange={handleElementFilterChange}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Element" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Elements</SelectItem>
                    <SelectItem value="Fire">Fire</SelectItem>
                    <SelectItem value="Water">Water</SelectItem>
                    <SelectItem value="Air">Air</SelectItem>
                    <SelectItem value="Earth">Earth</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.consciousnessLevel}
                  defaultValue={filters.consciousnessLevel}
                  onValueChange={handleConsciousnessLevelFilterChange}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Transcendent">Transcendent</SelectItem>
                    <SelectItem value="Illuminated">Illuminated</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                    <SelectItem value="Elevated">Elevated</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Awakening">Awakening</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.era}
                  defaultValue={filters.era}
                  onValueChange={handleEraFilterChange}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Era" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Eras</SelectItem>
                    <SelectItem value="Ancient">Ancient</SelectItem>
                    <SelectItem value="Medieval">Medieval</SelectItem>
                    <SelectItem value="Renaissance">Renaissance</SelectItem>
                    <SelectItem value="Enlightenment">Enlightenment</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Modern">Modern</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sorting Controls */}
                <Select
                  value={sortCriteria}
                  defaultValue={sortCriteria}
                  onValueChange={handleSortCriteriaChange}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortingOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="text-left">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-3"
                  title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortDirection === 'desc' ? '↓' : '↑'}
                </Button>

                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Consciousness Statistics */}
        {liveConsciousnessData && Object.keys(liveConsciousnessData).length > 0 && (
          <Card className="bg-black/40 backdrop-blur-md border-purple-500/30 text-white shadow-[0_0_30px_rgba(139,92,246,0.1)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-purple-600" />
                Live Consciousness Metrics
                {liveLoading && (
                  <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {(() => {
                  const validData = Object.values(liveConsciousnessData).filter(
                    d => d && typeof d === 'object' && 'liveMC' in d
                  )
                  const avgLiveMC =
                    validData.length > 0
                      ? validData.reduce((sum, d) => sum + (d.liveMC || 0), 0) / validData.length
                      : 0
                  const evolutionCount = validData.filter(
                    d => Math.abs(d.mcChange || 0) > 0.1
                  ).length
                  const enhancementCount = validData.filter(d => (d.mcChange || 0) > 0.1).length
                  const challengeCount = validData.filter(d => (d.mcChange || 0) < -0.1).length

                  return (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {avgLiveMC.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Live MC</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-indigo-600">{evolutionCount}</div>
                        <div className="text-xs text-muted-foreground">In Evolution</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{enhancementCount}</div>
                        <div className="text-xs text-muted-foreground">Enhanced</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">{challengeCount}</div>
                        <div className="text-xs text-muted-foreground">Challenged</div>
                      </div>
                    </>
                  )
                })()}
              </div>

              {liveError && (
                <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-500/30 p-2 rounded">
                  Live consciousness data unavailable: {liveError}
                </div>
              )}

              <div className="mt-3 text-xs text-muted-foreground">
                {liveLoading
                  ? 'Calculating live consciousness...'
                  : `Updated ${new Date().toLocaleTimeString()} • ${Object.keys(liveConsciousnessData).length} agents analyzed`}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historical Agents Display */}
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {isLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading consciousness repository...</p>
                </div>
              ) : (
                filteredAgents
                  .slice(0, visibleCount)
                  .map(agent => (
                    <EnhancedAgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgents.includes(agent.id)}
                      onToggleSelection={toggleAgentSelection}
                      showRecommendations={true}
                    />
                  ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">Loading consciousness repository...</p>
                </div>
              ) : (
                filteredAgents
                  .slice(0, visibleCount)
                  .map(agent => (
                    <EnhancedAgentCard
                      key={agent.id}
                      agent={agent}
                      variant="list"
                      isSelected={selectedAgents.includes(agent.id)}
                      onToggleSelection={toggleAgentSelection}
                      showRecommendations={true}
                    />
                  ))
              )}
            </div>
          )}

          {!isLoading && visibleCount < filteredAgents.length && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="w-full md:w-auto"
              >
                Load More Agents
              </Button>
            </div>
          )}
        </div>

        {/* Selected Agents Actions & Compatibility */}
        {selectedAgents.length > 0 && (
          <div className="space-y-4">
            <Card className="bg-black/40 backdrop-blur-md border-primary/30 text-white shadow-[0_0_30px_rgba(139,92,246,0.1)]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    <span className="font-medium">
                      {selectedAgents.length} agent{selectedAgents.length > 1 ? 's' : ''} selected
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Add to Party
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={selectedAgents.length === 0}
                      onClick={() => setShowGroupChat(true)}
                      className="flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Group Chat ({selectedAgents.length})
                    </Button>
                    <Button variant="outline" size="sm">
                      Compare
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAgents([])}>
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Display selected agents */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  {selectedAgents.map(agentId => {
                    const agent =
                      filteredAgents.find(a => a.id === agentId) ||
                      agents.find(a => a.id === agentId)
                    if (!agent) return null
                    return (
                      <div
                        key={agentId}
                        className="flex items-center justify-between p-3 bg-black/40 backdrop-blur rounded-lg border border-white/10"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: agent.appearance?.color || '#6366f1' }}
                          />
                          <span className="font-medium text-sm">{agent.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAgentSelection(agentId)}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Historical Council Chat */}
        <HistoricalCouncilChat
          isOpen={showGroupChat}
          onClose={() => setShowGroupChat(false)}
          historicalAgents={agents}
          filterBySelectedAgents={selectedAgents}
          title="Gallery Consciousness Council"
          maxAgents={5}
          allowMonica={true}
          showAgentBiographies={true}
          enableTimelineView={true}
          enableEraFilters={true}
          enableSpecializationGroups={true}
        />
      </div>
    </div>
  )
}

export default function GalleryPage() {
  return (
    <Suspense fallback={<div className="container py-8">Loading gallery...</div>}>
      <GalleryPageContent />
    </Suspense>
  )
}
