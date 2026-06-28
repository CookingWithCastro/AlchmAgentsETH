'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { ELEMENT_METADATA } from '@/lib/element-metadata'
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

import { StitchAgentCard } from '@/components/misc/stitch-agent-card'

import { useSearchParams } from 'next/navigation'
import { degreeAgentMatcher } from '@/lib/degree-agent-matcher'

const RULING_PLANETS: Record<string, string> = {
  Aries: 'Mars',
  Taurus: 'Venus',
  Gemini: 'Mercury',
  Cancer: 'Moon',
  Leo: 'Sun',
  Virgo: 'Mercury',
  Libra: 'Venus',
  Scorpio: 'Mars',
  Sagittarius: 'Jupiter',
  Capricorn: 'Saturn',
  Aquarius: 'Saturn',
  Pisces: 'Jupiter',
}

const FACTIONS = [
  { id: 'solaris', symbol: '☉', label: 'SOLARIS' },
  { id: 'lunaris', symbol: '☽', label: 'LUNARIS' },
  { id: 'mercury', symbol: '☿', label: 'MERCURY' },
  { id: 'venus', symbol: '♀', label: 'VENUS' },
  { id: 'mars', symbol: '♂', label: 'MARS' },
  { id: 'jupiter', symbol: '♃', label: 'JUPITER' },
  { id: 'saturn', symbol: '♄', label: 'SATURN' },
]

const ELEMENTS = [
  {
    id: 'Fire',
    label: 'SPIRIT / FIRE',
    colorClass: 'border-l-2 border-spirit-fire text-spirit-fire hover:bg-spirit-fire/10',
  },
  {
    id: 'Water',
    label: 'ESSENCE / WATER',
    colorClass: 'border-l-2 border-essence-water text-essence-water hover:bg-essence-water/10',
  },
  {
    id: 'Earth',
    label: 'MATTER / EARTH',
    colorClass: 'border-l-2 border-matter-earth text-matter-earth hover:bg-matter-earth/10',
  },
  {
    id: 'Air',
    label: 'SUBSTANCE / AIR',
    colorClass: 'border-l-2 border-substance-air text-substance-air hover:bg-substance-air/10',
  },
]

const ERAS = ['ANCIENT', 'CLASSICAL', 'MEDIEVAL', 'RENAISSANCE', 'ENLIGHTENMENT', 'MODERN']

function GalleryPageContent() {
  const [viewMode, setViewMode] = useState<GalleryViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [factionFilter, setFactionFilter] = useState<string>('all')
  const [clockTime, setClockTime] = useState('')
  const [stars, setStars] = useState<
    Array<{ width: string; height: string; left: string; top: string; animation: string }>
  >([])
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

  // Live Clock effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setClockTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Generate the decorative starfield client-side only (Math.random() at render
  // time differs SSR vs client → hydration mismatch; defer to a mount effect).
  useEffect(() => {
    setStars(
      Array.from({ length: 80 }).map(() => ({
        width: `${Math.random() * 2 + 0.5}px`,
        height: `${Math.random() * 2 + 0.5}px`,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `twinkle ${Math.random() * 4 + 2}s infinite ease-in-out`,
      }))
    )
  }, [])
  const [agents, setAgents] = useState<CraftedAgent[]>([])
  const [filteredAgents, setFilteredAgents] = useState<CraftedAgent[]>([])
  const [visibleCount, setVisibleCount] = useState(12)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showGroupChat, setShowGroupChat] = useState(false)
  const [sortCriteria, setSortCriteria] = useState<AgentSortCriteria>('relevanceScore')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
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
        setLoadError(null)
      } else {
        setAgents([])
        setLoadError('The historical-agent roster is temporarily unavailable.')
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
      setAgents([])
      setLoadError('The historical-agent roster is temporarily unavailable.')
    } finally {
      setIsLoading(false)
    }
  }

  // Load agents on mount
  useEffect(() => {
    fetchAgents()
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

    // Faction Filter (Ruling planet of Sun sign)
    if (factionFilter && factionFilter !== 'all') {
      filtered = filtered.filter(agent => {
        const sunSign = agent.consciousness?.natalChart?.planets?.Sun?.sign || ''
        const ruler = RULING_PLANETS[sunSign] || ''
        let matchRuler = factionFilter
        if (factionFilter.toLowerCase() === 'solaris') matchRuler = 'Sun'
        if (factionFilter.toLowerCase() === 'lunaris') matchRuler = 'Moon'
        return ruler.toLowerCase() === matchRuler.toLowerCase()
      })
    }

    // Element filter
    if (filters.element && filters.element !== 'all') {
      filtered = filtered.filter(
        agent => agent.consciousness.dominantElement.toLowerCase() === filters.element.toLowerCase()
      )
    }

    // Consciousness level filter
    if (filters.consciousnessLevel && filters.consciousnessLevel !== 'all') {
      filtered = filtered.filter(agent => agent.consciousness.level === filters.consciousnessLevel)
    }

    // Era filter
    if (filters.era && filters.era !== 'all') {
      filtered = filtered.filter(
        agent =>
          (agent.era ?? '').toLowerCase() === filters.era.toLowerCase() ||
          (agent.historicalEra ?? '').toLowerCase() === filters.era.toLowerCase()
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
  }, [agents, searchQuery, filters, factionFilter, sortCriteria, sortDirection, activatedByDegree])

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

  return (
    <div className="min-h-screen text-[#e0e1f3] relative bg-[#10131f] overflow-x-hidden font-body-md">
      {/* Dynamic Starfield Background */}
      <div className="starfield fixed inset-0 z-0 pointer-events-none overflow-hidden bg-radial-gradient">
        {stars.map((style, i) => (
          <div key={i} className="star absolute bg-white rounded-full opacity-35" style={style} />
        ))}
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.2); }
        }
      `,
        }}
      />

      <div className="container relative z-10 py-xxl space-y-gutter max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md pb-lg border-b border-border-gold/30 mb-xl">
          <div>
            <div className="flex items-center gap-xs mb-xs text-primary-gold font-mono-label text-mono-label uppercase tracking-widest">
              <span className="material-symbols-outlined text-sm">explore</span>
              <span>Consciousness Repository</span>
            </div>
            <h1 className="font-hero-title text-hero-title md:text-hero-title text-primary-gold leading-none py-2">
              Planetary Agents
            </h1>
          </div>
          <div className="flex items-center gap-md font-mono-label text-mono-label text-bright-gold mt-2 md:mt-0">
            <span className="w-2 h-2 rounded-full bg-primary-gold animate-pulse"></span>
            <span>SYSTEM: ACTIVE</span>
            <span className="text-muted-text">|</span>
            <span>{clockTime}</span>
          </div>
        </header>

        {/* Filter Board */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-gutter mb-xl relative z-10">
          {/* Left Side: Faction Lineage */}
          <div className="lg:col-span-3 flex flex-col gap-sm">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Faction Lineage
            </span>
            <div className="flex flex-wrap gap-sm">
              <button
                onClick={() => setFactionFilter('all')}
                className={`px-md py-xs rounded border flex items-center gap-xs hover:bg-white/5 transition-all font-mono-label text-mono-label uppercase ${
                  factionFilter === 'all'
                    ? 'border-primary-gold text-primary-gold bg-primary-gold/5'
                    : 'border-border-gold text-muted-text bg-[#12141f]/30'
                }`}
              >
                <span>ALL FACTIONS</span>
              </button>
              {FACTIONS.map(fac => (
                <button
                  key={fac.id}
                  onClick={() => setFactionFilter(factionFilter === fac.id ? 'all' : fac.id)}
                  className={`px-md py-xs rounded border flex items-center gap-xs hover:bg-white/5 transition-all font-mono-label text-mono-label uppercase ${
                    factionFilter === fac.id
                      ? 'border-primary-gold text-primary-gold bg-primary-gold/5'
                      : 'border-border-gold text-muted-text bg-[#12141f]/30'
                  }`}
                >
                  <span className="text-lg leading-none">{fac.symbol}</span>
                  <span>{fac.label}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Right Side: Scan Records Search */}
          <div className="flex flex-col justify-end gap-xs mt-4 lg:mt-0">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Scan Records
            </span>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-text text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Scan records..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0e19]/50 border border-border-gold py-2 pl-11 pr-4 focus:ring-1 focus:ring-primary-gold focus:border-primary-gold rounded outline-none transition-all placeholder:text-muted-text/50 font-mono-data text-mono-data text-ivory-text text-sm"
              />
            </div>
          </div>
        </section>

        {/* Sub-Filter Row */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-gutter mb-xl relative z-10">
          {/* Elemental Essence */}
          <div className="lg:col-span-2 flex flex-col gap-sm">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">
              Elemental Essence
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-sm">
              <button
                onClick={() => handleElementFilterChange('all')}
                className={`px-md py-xs rounded border transition-all text-center font-mono-label text-mono-label text-xs uppercase ${
                  filters.element === 'all'
                    ? 'border-white/40 text-white bg-white/5'
                    : 'border-border-gold text-muted-text hover:border-white/20 bg-[#12141f]/30'
                }`}
              >
                ALL
              </button>
              {ELEMENTS.map(el => (
                <button
                  key={el.id}
                  onClick={() =>
                    handleElementFilterChange(filters.element === el.id ? 'all' : el.id)
                  }
                  className={`px-md py-xs rounded border transition-all text-center font-mono-label text-mono-label text-xs uppercase ${el.colorClass} ${
                    filters.element === el.id
                      ? 'bg-white/5 border-white/40'
                      : 'border-border-gold/30'
                  }`}
                >
                  {el.label}
                </button>
              ))}
            </div>
          </div>
          {/* Chronos Era */}
          <div className="lg:col-span-2 flex flex-col gap-sm mt-4 lg:mt-0">
            <span className="font-eyebrow text-eyebrow text-muted-text uppercase">Chronos Era</span>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-sm">
              <button
                onClick={() => handleEraFilterChange('all')}
                className={`px-md py-xs rounded border transition-all text-center font-mono-label text-mono-label text-[10px] uppercase ${
                  filters.era === 'all'
                    ? 'border-primary-gold text-primary-gold bg-primary-gold/5'
                    : 'bg-[#181b27]/50 border-border-gold/30 text-muted-text hover:border-primary-gold/30'
                }`}
              >
                ALL
              </button>
              {ERAS.map(era => (
                <button
                  key={era}
                  onClick={() =>
                    handleEraFilterChange(
                      filters.era.toLowerCase() === era.toLowerCase() ? 'all' : era
                    )
                  }
                  className={`px-md py-xs rounded border transition-all text-center font-mono-label text-mono-label text-[10px] uppercase ${
                    filters.era.toLowerCase() === era.toLowerCase()
                      ? 'border-primary-gold text-primary-gold bg-primary-gold/5'
                      : 'bg-[#181b27]/50 border-border-gold/30 text-muted-text hover:border-primary-gold/30'
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Sort & Grid Controls */}
        <section className="flex flex-col md:flex-row justify-between items-center gap-md border-b border-border-gold/20 pb-md mb-lg relative z-10">
          <div className="flex flex-wrap items-center gap-sm">
            <span className="font-mono-label text-mono-label text-muted-text text-xs uppercase">
              Sort By:
            </span>
            <Select value={sortCriteria} onValueChange={handleSortCriteriaChange}>
              <SelectTrigger className="w-48 bg-[#0b0e19]/50 border-border-gold text-ivory-text text-xs font-mono-data rounded">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141f] border-border-gold text-ivory-text font-mono-data">
                {sortingOptions.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="hover:bg-white/5 cursor-pointer"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
              className="border-border-gold text-muted-text hover:border-primary-gold font-mono-label text-xs h-[36px]"
            >
              {sortDirection === 'desc' ? 'DESC ↓' : 'ASC ↑'}
            </Button>

            <span className="font-mono-label text-mono-label text-muted-text text-xs uppercase ml-md">
              Level:
            </span>
            <Select
              value={filters.consciousnessLevel}
              onValueChange={handleConsciousnessLevelFilterChange}
            >
              <SelectTrigger className="w-36 bg-[#0b0e19]/50 border-border-gold text-ivory-text text-xs font-mono-data rounded">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="bg-[#12141f] border-border-gold text-ivory-text font-mono-data">
                <SelectItem value="all" className="hover:bg-white/5 cursor-pointer">
                  All Levels
                </SelectItem>
                <SelectItem value="Transcendent" className="hover:bg-white/5 cursor-pointer">
                  Transcendent
                </SelectItem>
                <SelectItem value="Illuminated" className="hover:bg-white/5 cursor-pointer">
                  Illuminated
                </SelectItem>
                <SelectItem value="Advanced" className="hover:bg-white/5 cursor-pointer">
                  Advanced
                </SelectItem>
                <SelectItem value="Elevated" className="hover:bg-white/5 cursor-pointer">
                  Elevated
                </SelectItem>
                <SelectItem value="Active" className="hover:bg-white/5 cursor-pointer">
                  Active
                </SelectItem>
                <SelectItem value="Awakening" className="hover:bg-white/5 cursor-pointer">
                  Awakening
                </SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1.5 ml-md">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-border-gold hover:border-primary-gold font-mono-label text-xs h-[36px]"
              >
                <Link href="/rune-forge">Rune Forge</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-primary-gold hover:bg-primary-gold/80 text-background font-mono-label text-xs h-[36px]"
              >
                <Link href="/philosophers-stone">Craft Agent</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            {selectedAgents.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGroupChat(true)}
                className="border-primary-gold text-primary-gold bg-primary-gold/5 hover:bg-primary-gold/15 font-mono-label text-xs h-[36px] flex items-center gap-1"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                CONSPIRACY GROUP CHAT ({selectedAgents.length})
              </Button>
            )}
            <div className="flex border border-border-gold rounded overflow-hidden">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-none h-8 w-10 p-0 border-none ${viewMode === 'grid' ? 'bg-primary-gold/10 text-primary-gold' : 'text-muted-text hover:text-white bg-[#0b0e19]/50'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-none h-8 w-10 p-0 border-none ${viewMode === 'list' ? 'bg-primary-gold/10 text-primary-gold' : 'text-muted-text hover:text-white bg-[#0b0e19]/50'}`}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* Live Consciousness Statistics */}
        {liveConsciousnessData && Object.keys(liveConsciousnessData).length > 0 && (
          <div className="bg-[#12141f]/60 backdrop-blur-md border border-border-gold/30 rounded-lg p-lg shadow-[0_0_30px_rgba(216,180,106,0.02)] relative z-10">
            <h3 className="flex items-center gap-2 text-headline-sm font-headline-sm text-bright-gold mb-md">
              <Activity className="w-5 h-5 text-primary-gold" />
              Live Consciousness Metrics
              {liveLoading && (
                <div className="w-3 h-3 rounded-full bg-primary-gold animate-pulse" />
              )}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter text-sm mb-sm">
              {(() => {
                const validData = Object.values(liveConsciousnessData).filter(
                  d => d && typeof d === 'object' && 'liveMC' in d
                )
                const avgLiveMC =
                  validData.length > 0
                    ? validData.reduce((sum, d) => sum + (d.liveMC || 0), 0) / validData.length
                    : 0
                const evolutionCount = validData.filter(d => Math.abs(d.mcChange || 0) > 0.1).length
                const enhancementCount = validData.filter(d => (d.mcChange || 0) > 0.1).length
                const challengeCount = validData.filter(d => (d.mcChange || 0) < -0.1).length

                return (
                  <>
                    <div className="text-center p-md bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                      <div className="text-2xl font-bold text-primary-gold font-mono-data">
                        {avgLiveMC.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-text font-mono-label mt-1">
                        Avg Live MC
                      </div>
                    </div>
                    <div className="text-center p-md bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                      <div className="text-2xl font-bold text-substance-air font-mono-data">
                        {evolutionCount}
                      </div>
                      <div className="text-xs text-muted-text font-mono-label mt-1">
                        In Evolution
                      </div>
                    </div>
                    <div className="text-center p-md bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                      <div className="text-2xl font-bold text-matter-earth font-mono-data">
                        +{enhancementCount}
                      </div>
                      <div className="text-xs text-muted-text font-mono-label mt-1">Enhanced</div>
                    </div>
                    <div className="text-center p-md bg-[#0b0e19]/40 border border-border-gold/10 rounded">
                      <div className="text-2xl font-bold text-spirit-fire font-mono-data">
                        -{challengeCount}
                      </div>
                      <div className="text-xs text-muted-text font-mono-label mt-1">Challenged</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {liveError && (
              <div className="mt-3 text-xs text-red-400 bg-red-950/20 border border-red-800/30 p-2 rounded font-mono-data">
                Live consciousness data unavailable: {liveError}
              </div>
            )}

            <div className="mt-3 text-xs text-muted-text font-mono-label text-right">
              {liveLoading
                ? 'Calculating live consciousness...'
                : `Updated ${new Date().toLocaleTimeString()} · ${Object.keys(liveConsciousnessData).length} agents analyzed`}
            </div>
          </div>
        )}

        {/* Historical Agents Display */}
        <div className="space-y-4 relative z-10">
          {loadError && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100 font-mono-data">
              {loadError}
            </div>
          )}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
              {isLoading ? (
                <div className="col-span-full text-center py-xxl">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-text font-mono-label uppercase">
                    Loading consciousness repository...
                  </p>
                </div>
              ) : (
                filteredAgents
                  .slice(0, visibleCount)
                  .map(agent => (
                    <StitchAgentCard
                      key={agent.id}
                      agent={agent}
                      isSelected={selectedAgents.includes(agent.id)}
                      onToggleSelection={toggleAgentSelection}
                    />
                  ))
              )}
            </div>
          ) : (
            <div className="space-y-sm">
              {isLoading ? (
                <div className="text-center py-xxl">
                  <div className="animate-spin w-8 h-8 border-2 border-primary-gold border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-text font-mono-label uppercase">
                    Loading consciousness repository...
                  </p>
                </div>
              ) : (
                filteredAgents
                  .slice(0, visibleCount)
                  .map(agent => (
                    <StitchAgentCard
                      key={agent.id}
                      agent={agent}
                      variant="list"
                      isSelected={selectedAgents.includes(agent.id)}
                      onToggleSelection={toggleAgentSelection}
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
                className="w-full md:w-auto border-border-gold text-bright-gold hover:border-primary-gold font-mono-label text-xs px-lg py-md h-[40px] uppercase bg-[#12141f]/40"
              >
                Retrieve Next Cycle
              </Button>
            </div>
          )}
        </div>

        {/* Selected Agents Actions Panel */}
        {selectedAgents.length > 0 && (
          <div className="space-y-4 relative z-10">
            <div className="bg-[#12141f]/60 backdrop-blur-md border border-border-gold text-white p-lg rounded-lg shadow-[0_0_30px_rgba(216,180,106,0.02)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-md mb-4 pb-md border-b border-border-gold/20">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary-gold animate-bounce" />
                  <span className="font-mono-label text-mono-label text-bright-gold">
                    {selectedAgents.length} Agent{selectedAgents.length > 1 ? 's' : ''} Staged for
                    Convergence
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedAgents.length === 0}
                    onClick={() => setShowGroupChat(true)}
                    className="border-primary-gold text-primary-gold bg-primary-gold/5 hover:bg-primary-gold/15 font-mono-label text-xs h-[36px] flex items-center gap-1.5 uppercase"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    CONVENE COUNCIL ({selectedAgents.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedAgents([])}
                    className="text-muted-text hover:text-white font-mono-label text-xs uppercase"
                  >
                    Clear Slate
                  </Button>
                </div>
              </div>

              {/* Display selected agents inline */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-sm">
                {selectedAgents.map(agentId => {
                  const agent =
                    filteredAgents.find(a => a.id === agentId) || agents.find(a => a.id === agentId)
                  if (!agent) return null
                  const element = agent.consciousness?.dominantElement || 'Air'
                  const meta =
                    ELEMENT_METADATA[element as keyof typeof ELEMENT_METADATA] ||
                    ELEMENT_METADATA.Air
                  return (
                    <div
                      key={agentId}
                      className="flex items-center justify-between p-xs bg-[#0b0e19]/60 backdrop-blur rounded border border-border-gold/20"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${meta.bg}`} />
                        <span className="font-mono-data text-xs text-ivory-text truncate">
                          {agent.name}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleAgentSelection(agentId)}
                        className="text-muted-text hover:text-red-400 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Info Section: Understanding the Seven Sacred Stats */}
        <details className="group border border-border-gold/30 rounded-lg bg-[#12141f]/20 transition-all duration-300 relative z-10">
          <summary className="cursor-pointer p-md font-headline-sm text-bright-gold select-none flex items-center justify-between hover:bg-white/[0.02]">
            <span className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-primary-gold" />
              THE SEVEN SACRED STATS: LIVING CONSCIOUSNESS METRICS
            </span>
            <span className="material-symbols-outlined transition-transform duration-300 group-open:rotate-180 text-muted-text">
              expand_more
            </span>
          </summary>
          <div className="p-md border-t border-border-gold/20 space-y-md">
            <p className="text-sm text-muted-text">
              Each agent's consciousness is measured through seven dynamic vital signs that
              fluctuate with cosmic rhythms, planetary hours, and celestial alignments. These aren't
              static numbers—they're living measurements of consciousness energy.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sm">
              <div className="p-md bg-[#0b0e19]/40 rounded border border-border-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <span className="font-bold text-orange-400 text-sm">Power</span>
                </div>
                <p className="text-xs text-muted-text">
                  Capacity for work measured by rate of energy change. Amplified +30% during Sun
                  hours. Drives manifestation.
                </p>
              </div>
              <div className="p-md bg-[#0b0e19]/40 rounded border border-border-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-purple-400 text-sm">Resonance</span>
                </div>
                <p className="text-xs text-muted-text">
                  Rate of element transformation. Mercury hours boost +10%, element-specific peaks
                  vary +15-20%.
                </p>
              </div>
              <div className="p-md bg-[#0b0e19]/40 rounded border border-border-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-indigo-400 text-sm">Wisdom</span>
                </div>
                <p className="text-xs text-muted-text">
                  Knowledge depth from experiences and universal access. Grows with chats.
                </p>
              </div>
              <div className="p-md bg-[#0b0e19]/40 rounded border border-border-gold/10">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span className="font-bold text-pink-400 text-sm">Charisma</span>
                </div>
                <p className="text-xs text-muted-text">
                  Magnetic presence and influence. Pulses with Venus cycles and lunar phases.
                </p>
              </div>
            </div>
          </div>
        </details>

        {/* Historical Council Chat Modal */}
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
